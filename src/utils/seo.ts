const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character] ?? character);

const createMetaTag = (attributes: Record<string, string>): string => {
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ');
  return `<meta ${attrs}>`;
};

const createLinkTag = (attributes: Record<string, string>): string => {
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ');
  return `<link ${attrs}>`;
};

const createOpenGraphTag = (property: string, content: string): string =>
  createMetaTag({ property: `og:${property}`, content });

export interface OpenGraphMedia {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
  secureUrl?: string;
}

export interface OpenGraphProfile {
  firstName?: string;
  lastName?: string;
  username?: string;
  gender?: string;
}

export interface OpenGraphBook {
  authors?: ReadonlyArray<string>;
  isbn?: string;
  releaseDate?: string;
  tags?: ReadonlyArray<string>;
}

export interface OpenGraphArticle {
  publishedTime?: string;
  modifiedTime?: string;
  expirationTime?: string;
  authors?: ReadonlyArray<string>;
  section?: string;
  tags?: ReadonlyArray<string>;
}

export interface OpenGraphVideoActor {
  profile: string;
  role?: string;
}

export interface OpenGraphVideo {
  actors?: ReadonlyArray<OpenGraphVideoActor>;
  directors?: ReadonlyArray<string>;
  writers?: ReadonlyArray<string>;
  duration?: number;
  releaseDate?: string;
  tags?: ReadonlyArray<string>;
  series?: string;
}

export interface OpenGraph {
  url?: string;
  type?: string;
  title?: string;
  description?: string;
  images?: ReadonlyArray<OpenGraphMedia>;
  videos?: ReadonlyArray<OpenGraphMedia>;
  locale?: string;
  site_name?: string;
  profile?: OpenGraphProfile;
  book?: OpenGraphBook;
  article?: OpenGraphArticle;
  video?: OpenGraphVideo;
}

export interface Twitter {
  handle?: string;
  site?: string;
  cardType?: string;
}

export interface MobileAlternate {
  media: string;
  href: string;
}

export interface LanguageAlternate {
  hreflang: string;
  href: string;
}

export interface LinkTag {
  rel: string;
  href: string;
  sizes?: string;
  media?: string;
  type?: string;
  color?: string;
  as?: string;
  crossOrigin?: string;
}

export interface BaseMetaTag {
  content: string;
}

export interface HTML5MetaTag extends BaseMetaTag {
  name: string;
  property?: undefined;
  httpEquiv?: undefined;
}

export interface RDFaMetaTag extends BaseMetaTag {
  property: string;
  name?: undefined;
  httpEquiv?: undefined;
}

export interface HTTPEquivMetaTag extends BaseMetaTag {
  httpEquiv: 'content-security-policy' | 'content-type' | 'default-style' | 'x-ua-compatible' | 'refresh';
  name?: undefined;
  property?: undefined;
}

export type MetaTag = HTML5MetaTag | RDFaMetaTag | HTTPEquivMetaTag;

export type ImagePrevSize = 'none' | 'standard' | 'large';

export interface AdditionalRobotsProps {
  nosnippet?: boolean;
  maxSnippet?: number;
  maxImagePreview?: ImagePrevSize;
  maxVideoPreview?: number;
  noarchive?: boolean;
  unavailableAfter?: string;
  noimageindex?: boolean;
  notranslate?: boolean;
}

export interface AstroSeoProps {
  title?: string;
  titleTemplate?: string;
  noindex?: boolean;
  nofollow?: boolean;
  robotsProps?: AdditionalRobotsProps;
  description?: string;
  canonical?: string;
  mobileAlternate?: MobileAlternate;
  languageAlternates?: ReadonlyArray<LanguageAlternate>;
  openGraph?: OpenGraph;
  facebook?: { appId: string };
  twitter?: Twitter;
  additionalMetaTags?: ReadonlyArray<MetaTag>;
  additionalLinkTags?: ReadonlyArray<LinkTag>;
}

const buildOpenGraphMediaTags = (mediaType: 'image' | 'video', media: ReadonlyArray<OpenGraphMedia>): string => {
  let tags = '';

  const addTag = (tag: string) => {
    tags += `${tag}\n`;
  };

  media.forEach((medium) => {
    addTag(createOpenGraphTag(mediaType, medium.url));

    if (medium.alt) {
      addTag(createOpenGraphTag(`${mediaType}:alt`, medium.alt));
    }

    if (medium.secureUrl) {
      addTag(createOpenGraphTag(`${mediaType}:secure_url`, medium.secureUrl));
    }

    if (medium.type) {
      addTag(createOpenGraphTag(`${mediaType}:type`, medium.type));
    }

    if (medium.width) {
      addTag(createOpenGraphTag(`${mediaType}:width`, medium.width.toString()));
    }

    if (medium.height) {
      addTag(createOpenGraphTag(`${mediaType}:height`, medium.height.toString()));
    }
  });

  return tags;
};

export const buildTags = (config: AstroSeoProps): string => {
  let tagsToRender = '';

  const addTag = (tag: string) => {
    tagsToRender += `${tag}\n`;
  };

  if (config.title) {
    const formattedTitle = config.titleTemplate ? config.titleTemplate.replace('%s', config.title) : config.title;
    addTag(`<title>${escapeHtml(formattedTitle)}</title>`);
  }

  if (config.description) {
    addTag(createMetaTag({ name: 'description', content: config.description }));
  }

  const robotsContent: string[] = [];
  if (typeof config.noindex !== 'undefined') {
    robotsContent.push(config.noindex ? 'noindex' : 'index');
  }

  if (typeof config.nofollow !== 'undefined') {
    robotsContent.push(config.nofollow ? 'nofollow' : 'follow');
  }

  if (config.robotsProps) {
    const { nosnippet, maxSnippet, maxImagePreview, noarchive, unavailableAfter, noimageindex, notranslate } =
      config.robotsProps;

    if (nosnippet) robotsContent.push('nosnippet');
    if (typeof maxSnippet === 'number') robotsContent.push(`max-snippet:${maxSnippet}`);
    if (maxImagePreview) robotsContent.push(`max-image-preview:${maxImagePreview}`);
    if (noarchive) robotsContent.push('noarchive');
    if (unavailableAfter) robotsContent.push(`unavailable_after:${unavailableAfter}`);
    if (noimageindex) robotsContent.push('noimageindex');
    if (notranslate) robotsContent.push('notranslate');
  }

  if (robotsContent.length > 0) {
    addTag(createMetaTag({ name: 'robots', content: robotsContent.join(',') }));
  }

  if (config.canonical) {
    addTag(createLinkTag({ rel: 'canonical', href: config.canonical }));
  }

  if (config.mobileAlternate) {
    addTag(
      createLinkTag({
        rel: 'alternate',
        media: config.mobileAlternate.media,
        href: config.mobileAlternate.href,
      })
    );
  }

  if (config.languageAlternates?.length) {
    config.languageAlternates.forEach((languageAlternate) => {
      addTag(
        createLinkTag({
          rel: 'alternate',
          hreflang: languageAlternate.hreflang,
          href: languageAlternate.href,
        })
      );
    });
  }

  if (config.openGraph) {
    const title = config.openGraph.title || config.title;
    if (title) {
      addTag(createOpenGraphTag('title', title));
    }

    const description = config.openGraph.description || config.description;
    if (description) {
      addTag(createOpenGraphTag('description', description));
    }

    if (config.openGraph.url) {
      addTag(createOpenGraphTag('url', config.openGraph.url));
    }

    if (config.openGraph.type) {
      addTag(createOpenGraphTag('type', config.openGraph.type));
    }

    if (config.openGraph.images?.length) {
      addTag(buildOpenGraphMediaTags('image', config.openGraph.images));
    }

    if (config.openGraph.videos?.length) {
      addTag(buildOpenGraphMediaTags('video', config.openGraph.videos));
    }

    if (config.openGraph.locale) {
      addTag(createOpenGraphTag('locale', config.openGraph.locale));
    }

    if (config.openGraph.site_name) {
      addTag(createOpenGraphTag('site_name', config.openGraph.site_name));
    }

    if (config.openGraph.profile) {
      if (config.openGraph.profile.firstName) {
        addTag(createOpenGraphTag('profile:first_name', config.openGraph.profile.firstName));
      }
      if (config.openGraph.profile.lastName) {
        addTag(createOpenGraphTag('profile:last_name', config.openGraph.profile.lastName));
      }
      if (config.openGraph.profile.username) {
        addTag(createOpenGraphTag('profile:username', config.openGraph.profile.username));
      }
      if (config.openGraph.profile.gender) {
        addTag(createOpenGraphTag('profile:gender', config.openGraph.profile.gender));
      }
    }

    if (config.openGraph.book) {
      config.openGraph.book.authors?.forEach((author) => {
        addTag(createOpenGraphTag('book:author', author));
      });
      if (config.openGraph.book.isbn) {
        addTag(createOpenGraphTag('book:isbn', config.openGraph.book.isbn));
      }
      if (config.openGraph.book.releaseDate) {
        addTag(createOpenGraphTag('book:release_date', config.openGraph.book.releaseDate));
      }
      config.openGraph.book.tags?.forEach((tag) => {
        addTag(createOpenGraphTag('book:tag', tag));
      });
    }

    if (config.openGraph.article) {
      if (config.openGraph.article.publishedTime) {
        addTag(createOpenGraphTag('article:published_time', config.openGraph.article.publishedTime));
      }
      if (config.openGraph.article.modifiedTime) {
        addTag(createOpenGraphTag('article:modified_time', config.openGraph.article.modifiedTime));
      }
      if (config.openGraph.article.expirationTime) {
        addTag(createOpenGraphTag('article:expiration_time', config.openGraph.article.expirationTime));
      }
      config.openGraph.article.authors?.forEach((author) => {
        addTag(createOpenGraphTag('article:author', author));
      });
      if (config.openGraph.article.section) {
        addTag(createOpenGraphTag('article:section', config.openGraph.article.section));
      }
      config.openGraph.article.tags?.forEach((tag) => {
        addTag(createOpenGraphTag('article:tag', tag));
      });
    }

    if (config.openGraph.video) {
      config.openGraph.video.actors?.forEach((actor) => {
        addTag(createOpenGraphTag('video:actor', actor.profile));
        if (actor.role) {
          addTag(createOpenGraphTag('video:actor:role', actor.role));
        }
      });
      config.openGraph.video.directors?.forEach((director) => {
        addTag(createOpenGraphTag('video:director', director));
      });
      config.openGraph.video.writers?.forEach((writer) => {
        addTag(createOpenGraphTag('video:writer', writer));
      });
      if (config.openGraph.video.duration) {
        addTag(createOpenGraphTag('video:duration', config.openGraph.video.duration.toString()));
      }
      if (config.openGraph.video.releaseDate) {
        addTag(createOpenGraphTag('video:release_date', config.openGraph.video.releaseDate));
      }
      config.openGraph.video.tags?.forEach((tag) => {
        addTag(createOpenGraphTag('video:tag', tag));
      });
      if (config.openGraph.video.series) {
        addTag(createOpenGraphTag('video:series', config.openGraph.video.series));
      }
    }
  }

  if (config.facebook?.appId) {
    addTag(createMetaTag({ property: 'fb:app_id', content: config.facebook.appId }));
  }

  if (config.twitter) {
    if (config.twitter.cardType) {
      addTag(createMetaTag({ name: 'twitter:card', content: config.twitter.cardType }));
    }

    if (config.twitter.site) {
      addTag(createMetaTag({ name: 'twitter:site', content: config.twitter.site }));
    }

    if (config.twitter.handle) {
      addTag(createMetaTag({ name: 'twitter:creator', content: config.twitter.handle }));
    }
  }

  config.additionalMetaTags?.forEach((metaTag) => {
    const attributes: Record<string, string> = {
      content: metaTag.content,
    };

    if ('name' in metaTag && metaTag.name) {
      attributes.name = metaTag.name;
    } else if ('property' in metaTag && metaTag.property) {
      attributes.property = metaTag.property;
    } else if ('httpEquiv' in metaTag && metaTag.httpEquiv) {
      attributes['http-equiv'] = metaTag.httpEquiv;
    }

    addTag(createMetaTag(attributes));
  });

  config.additionalLinkTags?.forEach((linkTag) => {
    const attributes: Record<string, string> = {
      rel: linkTag.rel,
      href: linkTag.href,
    };

    if (linkTag.sizes) {
      attributes.sizes = linkTag.sizes;
    }
    if (linkTag.media) {
      attributes.media = linkTag.media;
    }
    if (linkTag.type) {
      attributes.type = linkTag.type;
    }
    if (linkTag.color) {
      attributes.color = linkTag.color;
    }
    if (linkTag.as) {
      attributes.as = linkTag.as;
    }
    if (linkTag.crossOrigin) {
      attributes.crossorigin = linkTag.crossOrigin;
    }

    addTag(createLinkTag(attributes));
  });

  return tagsToRender.trim();
};
