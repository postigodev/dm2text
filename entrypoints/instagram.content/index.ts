import './style.css';

export default defineContentScript({
  matches: ['https://www.instagram.com/*'],
  main() {
    // Later wiring installs one delegated listener whose handler returns
    // immediately unless location.pathname.startsWith('/direct/').
  },
});
