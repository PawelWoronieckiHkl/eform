/**
 * JSDOM ResourceLoader that maps the URL paths used by the real frontend to
 * locations on disk:
 *
 *   /scripts/<rest>   -> <repoRoot>/public/scripts/<rest>
 *   /data/<rest>      -> <dataDir>/<rest>
 *
 * Anything else is denied (we don't want jsdom to make outbound HTTP calls).
 *
 * The real ResourceLoader signature returns a Promise that resolves with a
 * Buffer holding the resource bytes — the same convention is used here.
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const { ResourceLoader } = require('jsdom');
const { dataDir } = require('../../config');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

class FormEngineResourceLoader extends ResourceLoader {
  constructor(options = {}) {
    super();
    // Map of synthetic URL paths → string source. Used to inject the engine
    // bridge module without writing a real file under public/.
    this.virtualSources = options.virtualSources || {};
  }

  fetch(url, options) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (_e) {
      return Promise.reject(new Error(`formEngine: invalid URL ${url}`));
    }

    const pathname = parsed.pathname;

    // Virtual (in-memory) sources take precedence — used for the engine bridge.
    if (Object.prototype.hasOwnProperty.call(this.virtualSources, pathname)) {
      return Promise.resolve(Buffer.from(this.virtualSources[pathname], 'utf8'));
    }

    let absPath = null;

    if (pathname.startsWith('/scripts/')) {
      absPath = path.join(PUBLIC_DIR, pathname.replace(/^\//, ''));
    } else if (pathname.startsWith('/data/')) {
      absPath = path.join(dataDir, pathname.replace(/^\/data\//, ''));
    } else {
      // Everything else (CDN fonts, googleapis, etc.) is silently no-op'd
      // so the page can finish loading.
      return Promise.resolve(Buffer.from(''));
    }

    return fs.readFile(absPath).catch((err) => {
      const e = new Error(`formEngine: cannot read ${absPath}: ${err.message}`);
      e.code = err.code;
      throw e;
    });
  }
}

module.exports = { FormEngineResourceLoader, PUBLIC_DIR };
