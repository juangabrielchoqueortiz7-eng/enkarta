export interface GalleryCaption {
  /** Stable association: captions follow their photo when the gallery is reordered. */
  image?: string;
  title?: string;
  caption?: string;
  alt?: string;
}

export function captionsForImages(images: string[], captions: GalleryCaption[] = []): GalleryCaption[] {
  return images.map((image, index) => ({
    ...(captions.find(item => item?.image === image) ?? (!captions[index]?.image ? captions[index] : undefined)),
    image,
  }));
}

export function reorderGalleryCaptions(previous: string[], captions: GalleryCaption[], next: string[]): GalleryCaption[] {
  const associated = captionsForImages(previous, captions);
  return next.map(image => ({ ...(associated.find(item => item.image === image) ?? {}), image }));
}
