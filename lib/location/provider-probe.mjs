const urls = [
  "https://local-links-manager.publishing.service.gov.uk/api/link?authority_slug=kent&lgsl=557&lgil=17",
  "https://local-links-manager.publishing.service.gov.uk/api/link?authority_slug=edinburgh&lgsl=557&lgil=17",
  "https://photon.komoot.io/api/?q=282%20Mare%20Street%20London&countrycode=GB&limit=3&lang=en",
];

await Promise.all(urls.map(async url => {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "PotholeKiller/0.1 (https://github.com/ShabalalaWATP/PotholeKiller)" },
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.text();
    console.log(JSON.stringify({ url, status: response.status, body: body.slice(0, 7000) }));
  } catch (error) {
    console.log(JSON.stringify({ url, error: error.message }));
  }
}));
