const httpOrigin = /^(https?):\/\/(\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::([0-9]{1,5}))?(?=$|[/?#])/i;

function storeOrigin(value) {
  const input = (value || '').trim();
  const url = /^https?:\/\//i.test(input) ? input : 'http://' + input;
  const match = url.match(httpOrigin);
  if (!match || !/^\/?$/.test(url.slice(match[0].length))) return '';
  const [, scheme, host, port] = match;
  if (port && (+port < 1 || +port > 65535)) return '';
  const defaultPort = scheme.toLowerCase() === 'https' ? 443 : 80;
  return scheme.toLowerCase() + '://' + host.toLowerCase() + (port && +port !== defaultPort ? ':' + Number(port) : '');
}

function defaultStore(expoHost, platform) {
  const host = (expoHost || '').match(/^(\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::\d+)?$/i)?.[1];
  if (host === '10.0.2.2') return 'http://10.0.2.2:3000';
  if (host && !/^(localhost|127\.|\[::1\])/i.test(host) && !host.endsWith('.exp.direct')) {
    return storeOrigin('http://' + host + ':3000');
  }
  return platform === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

function isStorePage(url, origin) {
  const match = url.match(httpOrigin);
  return !!match && storeOrigin(match[0]) === origin;
}

module.exports = { storeOrigin, defaultStore, isStorePage };
