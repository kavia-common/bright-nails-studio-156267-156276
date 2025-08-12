export const getURL = () => {
  let url = process.env.REACT_APP_SITE_URL || 'http://localhost:3000';

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  if (!url.endsWith('/')) {
    url = `${url}/`;
  }
  return url;
};

export default getURL;
