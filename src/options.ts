import browser from 'webextension-polyfill';

const singleDefault = 'nijie/${userName}(${userId})/${title}(${id})';
const multiDefault = 'nijie/${userName}(${userId})/${title}(${id})/${page}';

function saveOptions(e: Event) {
  try {
    browser.storage.sync.set({
      single: (
        document.querySelector('#single_image') as HTMLInputElement
      ).value.trim(),
      multi: (
        document.querySelector('#multi_image') as HTMLInputElement
      ).value.trim(),
    });
    e.preventDefault();
    alert(browser.i18n.getMessage('saved'));
  } catch (e) {
    alert(browser.i18n.getMessage('errSaveFailed'));
  }
}

async function restoreOptions() {
  const setting = await browser.storage.sync.get(['single', 'multi']);
  const single = setting.single || singleDefault;
  const multi = setting.multi || multiDefault;
  (document.querySelector('#single_image') as HTMLInputElement).value = single;
  (document.querySelector('#multi_image') as HTMLInputElement).value = multi;
}

function translate() {
  const elems = document.querySelectorAll('[i18n]');

  for (const elem of elems) {
    const text = browser.i18n.getMessage(
      'settings_' + elem.getAttribute('i18n'),
    );

    if (elem instanceof HTMLInputElement && elem.type === 'submit') {
      elem.value = text;
    } else {
      elem.textContent = text;
    }
  }
}

async function init() {
  translate();
  await restoreOptions();
  document.querySelector('form')?.addEventListener('submit', saveOptions);
}

if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
