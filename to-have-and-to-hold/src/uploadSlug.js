// Shareable URLs for uploads: /<submitter>/<title>-<year>, e.g.
// /rose/grandma-and-grandpas-wedding-day-1962.

// Lowercase, drop apostrophes ("Grandpa's" -> "grandpas"), and turn every
// other run of non-letters/digits into a single hyphen.
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// The year is added for uniqueness, unless the title already ends with it
// ("New Year's Eve, 1999").
export function uploadPath(upload) {
  const title = slugify(upload.title)
  const year = String(upload.year)
  const slug = title.endsWith(`-${year}`) ? title : `${title}-${year}`
  return `/${slugify(upload.submitter)}/${slug}`
}

export function findUpload(uploads, submitter, slug) {
  return uploads.find((u) => uploadPath(u) === `/${submitter}/${slug}`)
}
