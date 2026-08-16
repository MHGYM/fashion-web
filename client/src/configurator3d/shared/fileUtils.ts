export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Leest een geüpload bestand in tot een tekenbare afbeelding + bewaart het
 *  ORIGINELE bestand als data-URL apart (nodig voor productie — zie
 *  requirement "bewaar altijd het originele geüploade bestand afzonderlijk"). */
export async function loadUploadedImage(file: File) {
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)
  return { img, dataUrl, fileName: file.name }
}

let idCounter = 0
export function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}
