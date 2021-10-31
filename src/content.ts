import browser from 'webextension-polyfill';

/**
 * ダウンロードする画像URLのリストを取得する
 */
const getImageSources = (): string[] => {
  const sources: string[] = [];

  // メイン画像のURLを取得する
  const imgElem = document.querySelector('#img_filter > a > img');

  if (imgElem) {
    sources.push((imgElem as HTMLImageElement).src);
  } else {
    const videoElem = document.querySelector('#img_filter > a > video');
    if (!videoElem) return [];
    sources.push((videoElem as HTMLVideoElement).src);
  }

  // 差分のURLを取得する
  const imageNum = document.querySelectorAll('#img_diff > a').length;
  // console.log('multi image?', imageNum);
  if (imageNum > 0) {
    const diffElems = document.querySelectorAll('#img_diff > a > img');
    const diffUrls = Array.from(diffElems).map((elem) =>
      (elem as HTMLImageElement).src.replace('/__rs_l120x120', ''),
    );
    sources.push(...diffUrls);
  }
  return sources;
};

/**
 * ユーザーIDを取得する
 */
const getUserId = (): string => {
  const userPageUrl = (
    document.querySelector('#pro > p.user_icon > a') as HTMLAnchorElement
  ).href;
  const userId = userPageUrl.match(/id=(\d+)$/)?.[1];
  // console.log('user id', userId);
  return userId || '';
};

/**
 * タイトルを取得する
 */
const getTitle = (): string => {
  const title = document.querySelector('.illust_title')?.textContent;
  // console.log('title', title);
  return title || '';
};

/**
 * ユーザー名を取得する
 */
const getUserName = (): string => {
  const userName = document.querySelector(
    '#pro > p.user_icon > a',
  )?.textContent;
  // console.log('user name', userName);
  return userName || '';
};

/**
 * イラストIDを取得する
 */
const getIllustId = (): string => {
  const illustId = location.search.match(/id=(\d+)/)?.[1];
  // console.log('illust id', illustId);
  return illustId || '';
};

/**
 * 投稿時間を取得する
 */
const getPostDate = (): string => {
  const postDate = document
    .querySelector('#view-honbun > p > span')
    ?.textContent?.replace('投稿時間：', '');
  console.log('post date:', postDate);
  return postDate || '';
};

/**
 * バックグラウンドスクリプトからのメッセージを処理する
 */
const handleMessage = (request: any) => {
  if (request.type === 'downloaded') {
    downloaded++;
    if (downloaded === sources.length) {
      messageElem.textContent = browser.i18n.getMessage('done');
      browser.runtime.onMessage.removeListener(handleMessage);
      downloaded = 0;
    } else {
      messageElem.textContent = downloaded + ' / ' + sources.length;
    }
  }
};

/**
 * Downloadボタンが押された時の処理
 */
const save = async (): Promise<void> => {
  if (isClicked) {
    if (confirm(browser.i18n.getMessage('askContinue')) === false) return;
  } else {
    isClicked = true;
  }

  browser.runtime.onMessage.addListener(handleMessage);

  const response = await browser.runtime.sendMessage({
    type: 'download',
    urls: sources,
    title: getTitle(),
    illustId: getIllustId(),
    userId: getUserId(),
    userName: getUserName(),
    postDate: getPostDate(),
  });
  if (response && response.error) {
    alert('Error!\n' + response.error);
    return;
  }
  messageElem.textContent = '0 / ' + sources.length;
};

const sources = getImageSources();
const messageElem = document.createElement('p');
let isClicked = false;
let downloaded = 0;

if (sources.length) {
  const boxElem = document.createElement('div');
  boxElem.className = 'nijie_downloader-wrapper';
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'nijie_downloader-download_button';
  downloadBtn.textContent = browser.i18n.getMessage('download');
  downloadBtn.onclick = save;
  boxElem.appendChild(downloadBtn);
  messageElem.className = 'nijie_downloader-message';
  boxElem.appendChild(messageElem);
  document.getElementById('view-center-button')?.appendChild(boxElem);
}
