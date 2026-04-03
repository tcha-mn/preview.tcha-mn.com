import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import type { OpenGraph } from './seo';

const load = async function () {
  try {
    return import.meta.glob<{ default: ImageMetadata }>(
      '~/assets/images/**/*.{jpeg,jpg,png,tiff,webp,gif,svg,JPEG,JPG,PNG,TIFF,WEBP,GIF,SVG}'
    );
  } catch {
    // continue regardless of error
  }
};

let _images: Record<string, () => Promise<{ default: ImageMetadata }>> | undefined = undefined;

/** */
export const fetchLocalImages = async () => {
  _images = _images || (await load());
  return _images;
};

export async function findLocalImage(imagePath: string): Promise<ImageMetadata> {
  const images = await fetchLocalImages();
  const key = imagePath.replace('~/', '/src/');

  if (!images || !images[key]) {
    throw new Error(`Image not found: ${imagePath}`);
  }
  const { default: img } = await images[key]();
  return img;
}

export async function findImage(
  imagePath?: string | ImageMetadata | null
): Promise<string | ImageMetadata | undefined | null> {
  // Not string
  if (typeof imagePath !== 'string') {
    return imagePath;
  }

  // Absolute paths
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
    return imagePath;
  }

  // Relative paths or not "~/assets/"
  if (!imagePath.startsWith('~/assets/images')) {
    return imagePath;
  }
  return findLocalImage(imagePath);
}

/** */
export const adaptOpenGraphImages = async (openGraph: OpenGraph = {}, astroSite?: URL): Promise<OpenGraph> => {
  if (!openGraph?.images?.length) {
    return openGraph;
  }

  const images = openGraph.images;
  const defaultWidth = 1200;
  const defaultHeight = 626;

  const adaptedImages = await Promise.all(
    images.map(async (image) => {
      if (image?.url) {
        const resolvedImage = (await findImage(image.url)) as ImageMetadata | undefined;
        if (!resolvedImage) {
          return {
            url: '',
          };
        }

        const _image = await getImage({
          src: resolvedImage,
          alt: 'Placeholder alt',
          width: image?.width || defaultWidth,
          height: image?.height || defaultHeight,
        });

        if (typeof _image === 'object') {
          const resolvedUrl =
            typeof _image.src === 'string' ? (astroSite ? String(new URL(_image.src, astroSite)) : _image.src) : '';
          return {
            url: resolvedUrl,
            width: typeof _image.attributes.width === 'number' ? _image.attributes.width : undefined,
            height: typeof _image.attributes.height === 'number' ? _image.attributes.height : undefined,
          };
        }
        return {
          url: '',
        };
      }

      return {
        url: '',
      };
    })
  );

  return { ...openGraph, ...(adaptedImages ? { images: adaptedImages } : {}) };
};
