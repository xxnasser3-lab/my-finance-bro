import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { setLang } from './i18n';
import './styles.css';
import { applySavedTheme } from './theme';

setLang('ar');
applySavedTheme();
render(<App />, document.getElementById('app')!);

registerSW({ immediate: true });

// Ask the browser to keep our storage even when the device is low on space.
navigator.storage?.persist?.().catch(() => {});
