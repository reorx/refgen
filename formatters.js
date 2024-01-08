class MarkdownFormatter {
  renderLink(title, url) {
    // escape special characters in title: \`*_#+-{}[]()
    const escapedTitle = title.replace(/([\\`*_\{\}\[\]])/g, '\\$1');

    return `[${escapedTitle}](${url})`
  }

  parseLink(text) {
    // regex parse [title](url) from text
    const regex = /\[([^\]]+)\]\(([^\)]+)\)/g;

    let match = regex.exec(text);
    // if match, return first and second group
    if (match) {
      return {
        title: match[1],
        url: match[2],
      };
    }
  }
}

class AsciidocFormatter {
  renderLink(title, url) {
    return `${url}[${title}]`
  }

  parseLink(text) {
    // regex parse url[title] from text
    const regex = /([^\)]+)\[([^\]]+)\]/g;

    let match = regex.exec(text);
    // if match, return first and second group
    if (match) {
      return {
        title: match[2],
        url: match[1],
      };
    }
  }
}

class RSTFormatter {
  renderLink(title, url) {
    return `\`${title} <${url}>\`_`
  }

  parseLink(text) {
    // regex parse `url <title>`_ from text
    const regex = /\`([^<]+)\s<([^>]+)>\`_/g;

    let match = regex.exec(text);
    // if match, return first and second group
    if (match) {
      return {
        title: match[1],
        url: match[2],
      };
    }
  }
}

class MediaWikiFormatter {
  renderLink(title, url) {
    return `[${url} ${title}]`
  }

  parseLink(text) {
    // regex parse [url title] from text
    const regex = /\[([^\]\s]+)\s([^\]]+)\]/g;

    let match = regex.exec(text);
    // if match, return first and second group
    if (match) {
      return {
        title: match[2],
        url: match[1],
      };
    }
  }
}

class HTMLFormatter {
  renderLink(title, url) {
    return `<a href="${url}">${title}</a>`
  }
}
