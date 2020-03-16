import { browser } from 'webextension-polyfill-ts';

const singleDefault = 'nijie/${userName}(${userId})/${title}(${id})';
const multiDefault = 'nijie/${userName}(${userId})/${title}(${id})/${page}';

interface Info {
  urls: string[];
  title: string;
  illustId: string;
  userId: string;
  userName: string;
}

// ダウンロード中のアイテムのID
const downloadingIds: number[] = [];

/**
 * 保存ファイル名用連番数字幅を計算する
 *
 * 例：
 * 全部で9枚→1桁(1 - 9)
 * 全部で10枚→2桁(01 - 10)
 * @param length 画像ファイルリストの長さ
 */
const calcWidth = (length: number): number => {
  return length.toString().length;
};

/**
 * 保存先パスを取得する
 * @param pathElems 保存先パスの設定
 */
const getSavePath = (pathElems: string[], info: Info): string[] => {
  return pathElems.map((pathElem) => {
    pathElem = pathElem.replace('${id}', esc(info.illustId));
    pathElem = pathElem.replace('${title}', esc(info.title));
    pathElem = pathElem.replace('${userId}', esc(info.userId));
    pathElem = pathElem.replace('${userName}', esc(info.userName));
    return pathElem;
  });
};

/**
 * ページ数を返す
 * @param width 連番数字幅
 * @param index 添字
 */
const getPageNumber = (width: number, index: number): string => {
  return index.toString().padStart(width, '0');
};

/**
 * 保存ファイル名を取得する
 */
const getSaveFileName = (
  setting: string,
  url: string,
  width: number,
  index: number,
): string => {
  const extension = url.substring(url.lastIndexOf('.'));
  setting = setting.replace('${page}', getPageNumber(width, index));
  return setting + extension;
};

/**
 * ファイル名に使えない文字を置換する
 *
 * usable: +-=[]{}@`;_.,&%$#!^
 * unusable: \/:*?"<>|~
 * Unusable chars are not depending on os.
 */
const esc = (str: string): string => {
  return str.replace(/[\\/:*?"<>|~]/g, '_');
};

/**
 * 保存先パス設定を返す
 *
 * @param isSingle 複数枚かどうか
 */
const getSaveFilePathSetting = async (isSingle: boolean): Promise<string> => {
  const setting = await browser.storage.sync.get(['single', 'multi']);
  const single = setting.single || singleDefault;
  const multi = setting.multi || multiDefault;
  return isSingle ? single : multi;
};

/**
 * ダウンロードする
 */
const download = async (info: Info): Promise<any> => {
  // console.log('Receive download task.');
  const width = calcWidth(info.urls.length);

  const setting = await getSaveFilePathSetting(info.urls.length === 1);
  const pathElems = setting.split('/');
  const savePaths = await getSavePath(pathElems, info);
  const fileNameSetting = savePaths.pop();
  const savePath = savePaths.join('/');
  if (!fileNameSetting) {
    throw new Error('save file path setting is invalid!');
  }
  for (let i = 0; i < info.urls.length; i++) {
    const url = info.urls[i];
    const index = i + 1;
    const saveFilePath =
      savePath + '/' + getSaveFileName(fileNameSetting, url, width, index);
    // console.log(url);
    // console.log(saveFilePath);
    try {
      const downloadId = await browser.downloads.download({
        url,
        filename: saveFilePath,
        conflictAction: 'uniquify',
      });
      downloadingIds.push(downloadId);
      await browser.downloads.search({ id: downloadId });
      // const downloadItems = await browser.downloads.search({ id: downloadId });
      // console.log('start download', downloadItems[0].url);
    } catch (e) {
      // console.log(e.message);
      return { error: e.message };
    }
  }
};

// main
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'download') {
    if (downloadingIds.length) {
      return Promise.resolve({
        error: browser.i18n.getMessage('errWaitOtherDownload'),
      });
    }
    return download(message);
  }
});

browser.downloads.onChanged.addListener(async (delta) => {
  if (downloadingIds.includes(delta.id) && delta.state) {
    if (delta.state.current === 'complete') {
      await browser.downloads.search({ id: delta.id });
      // const downloadItems = await browser.downloads.search({ id: delta.id });
      // console.log('finish download', downloadItems[0].url);
      downloadingIds.splice(downloadingIds.indexOf(delta.id), 1);
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      for (let tab of tabs) {
        if (tab.id == undefined) continue;
        browser.tabs.sendMessage(tab.id, {
          downloading: downloadingIds.length,
        });
      }
    }
  }
});
