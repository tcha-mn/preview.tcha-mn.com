#!/usr/bin/env node

import process from 'node:process';

const API_BASE_URL = 'https://api.cloudflare.com/client/v4';
const PHASE = 'http_request_dynamic_redirect';
const MANAGED_REF_PREFIX = 'repo_redirect__';
const READ_ONLY_RULE_FIELDS = new Set(['id', 'version', 'last_updated', 'categories']);
const VALID_STATUS_CODES = new Set([301, 302]);
const DEFAULT_HOSTS = ['preview.tcha-mn.com', 'tcha-mn.com'];
const PRESERVE_UNMANAGED_RULES = true;
const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || 'fzxx7ejh';
const SANITY_DATASET = process.env.SANITY_DATASET || 'production';
const SANITY_API_VERSION = process.env.SANITY_API_VERSION || '2024-05-07';
const SANITY_API_TOKEN = process.env.SANITY_API_TOKEN;
const SANITY_REDIRECTS_QUERY =
  '*[_type == "redirects" && enabled == true] | order(name asc){_id,name,paths,statusCode,target{type,url,file{asset->{url}}}}';

function parseArgs(argv) {
  const options = {
    apply: false,
  };

  for (const argument of argv) {
    if (argument === '--apply') {
      options.apply = true;
      continue;
    }

    if (argument === '--check') {
      options.apply = false;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function asNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function asInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer.`);
  }

  return value;
}

function cfString(value) {
  return JSON.stringify(value);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeRefSegment(value) {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized || 'redirect';
}

function buildPathCondition(requestPath) {
  if (requestPath.endsWith('*')) {
    const prefix = requestPath.slice(0, -1);
    return `http.request.uri.path matches ${cfString(`^${escapeRegex(prefix)}.*$`)}`;
  }

  return `http.request.uri.path eq ${cfString(requestPath)}`;
}

function buildExpression({ hosts, paths }) {
  const conditions = [];

  if (hosts.length === 1) {
    conditions.push(`http.host eq ${cfString(hosts[0])}`);
  } else if (hosts.length > 1) {
    const hostChecks = hosts.map((host) => `http.host eq ${cfString(host)}`);
    conditions.push(`(${hostChecks.join(' or ')})`);
  }

  const pathConditions = paths.map((path) => buildPathCondition(path));
  if (pathConditions.length === 1) {
    conditions.push(pathConditions[0]);
  } else {
    conditions.push(`(${pathConditions.join(' or ')})`);
  }

  return conditions.join(' and ');
}

function sanitizeRuleForPut(rule) {
  return Object.fromEntries(Object.entries(rule).filter(([key]) => !READ_ONLY_RULE_FIELDS.has(key)));
}

function buildSanityQueryUrl(query) {
  const url = new URL(`https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`);
  url.searchParams.set('query', query);
  url.searchParams.set('perspective', 'published');
  return url;
}

function summarizeRule(rule) {
  const target =
    rule?.action_parameters?.from_value?.target_url?.value ||
    rule?.action_parameters?.from_value?.target_url?.expression ||
    '<unknown target>';
  const statusCode = rule?.action_parameters?.from_value?.status_code ?? '<unknown status>';
  const description = rule?.description || rule?.ref || '<unnamed rule>';

  return `${description} | ${statusCode} | ${target}`;
}

function extractRequestPathsFromExpression(expression) {
  if (typeof expression !== 'string' || expression.trim() === '') {
    return [];
  }

  const paths = new Set();
  const exactPathMatches = expression.matchAll(/http\.request\.uri\.path eq "(.*?)"/g);
  for (const match of exactPathMatches) {
    paths.add(match[1]);
  }

  const wildcardMatches = expression.matchAll(/http\.request\.uri\.path matches "\^(.*?)\.\*\$"/g);
  for (const match of wildcardMatches) {
    const rawPrefix = match[1].replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
    paths.add(`${rawPrefix}*`);
  }

  const fullUriWildcardMatches = expression.matchAll(/http\.request\.full_uri wildcard r"https:\/\/[^/]+(.*?)"/g);
  for (const match of fullUriWildcardMatches) {
    paths.add(match[1]);
  }

  return Array.from(paths);
}

function pathsLikelyOverlap(leftPath, rightPath) {
  if (leftPath === rightPath) {
    return true;
  }

  const leftWildcard = leftPath.endsWith('*');
  const rightWildcard = rightPath.endsWith('*');
  const leftPrefix = leftWildcard ? leftPath.slice(0, -1) : leftPath;
  const rightPrefix = rightWildcard ? rightPath.slice(0, -1) : rightPath;

  if (leftWildcard && rightWildcard) {
    return leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix);
  }

  if (leftWildcard) {
    return rightPath.startsWith(leftPrefix);
  }

  if (rightWildcard) {
    return leftPath.startsWith(rightPrefix);
  }

  return false;
}

function findLikelyOverlaps(managedRules, unmanagedRules) {
  const overlaps = [];

  for (const managedRule of managedRules) {
    const managedPaths = extractRequestPathsFromExpression(managedRule.expression);
    if (managedPaths.length === 0) {
      continue;
    }

    for (const unmanagedRule of unmanagedRules) {
      const unmanagedPaths = extractRequestPathsFromExpression(unmanagedRule.expression);
      if (unmanagedPaths.length === 0) {
        continue;
      }

      const overlappingPaths = [];
      for (const managedPath of managedPaths) {
        for (const unmanagedPath of unmanagedPaths) {
          if (pathsLikelyOverlap(managedPath, unmanagedPath)) {
            overlappingPaths.push(`${managedPath} <> ${unmanagedPath}`);
          }
        }
      }

      if (overlappingPaths.length > 0) {
        overlaps.push({
          managedRule,
          unmanagedRule,
          overlappingPaths,
        });
      }
    }
  }

  return overlaps;
}

function logRuleList(title, items) {
  if (items.length === 0) {
    console.log(`${title}: none`);
    return;
  }

  console.log(`${title}:`);
  for (const item of items) {
    console.log(`- ${item}`);
  }
}

function normalizePath(value, label) {
  const path = asNonEmptyString(value, label);

  if (!path.startsWith('/')) {
    throw new Error(`${label} must start with '/'.`);
  }

  if (path.includes('://')) {
    throw new Error(`${label} must be a relative path, not a full URL.`);
  }

  if (path.includes('*') && !path.endsWith('*')) {
    throw new Error(`${label} only supports '*' as a trailing wildcard.`);
  }

  return path;
}

function normalizeAbsoluteUrl(value, label) {
  const target = asNonEmptyString(value, label);
  let parsedUrl;

  try {
    parsedUrl = new URL(target);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`${label} must use http or https.`);
  }

  return target;
}

function normalizeTargetValue(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a target object.`);
  }

  if (typeof value.url === 'string' && value.url.trim() !== '') {
    return normalizeAbsoluteUrl(value.url, `${label}.url`);
  }

  const fileUrl = value?.file?.asset?.url;
  if (typeof fileUrl === 'string' && fileUrl.trim() !== '') {
    return normalizeAbsoluteUrl(fileUrl, `${label}.file.asset.url`);
  }

  throw new Error(`${label} must include either a target.url or target.file.asset.url value.`);
}

function normalizeSanityRedirect(entry, index) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`redirects[${index}] must be an object.`);
  }

  const documentId = asNonEmptyString(entry._id, `redirects[${index}]._id`);
  const name = asNonEmptyString(entry.name, `redirects[${index}].name`);
  const statusCode = asInteger(entry.statusCode, `redirects[${index}].statusCode`);

  if (!VALID_STATUS_CODES.has(statusCode)) {
    throw new Error(`redirects[${index}].statusCode must be one of 301 or 302.`);
  }

  if (!Array.isArray(entry.paths) || entry.paths.length === 0) {
    throw new Error(`redirects[${index}].paths must be a non-empty array.`);
  }

  const seenPaths = new Set();
  const paths = entry.paths.map((value, pathIndex) => {
    const normalizedPath = normalizePath(value, `redirects[${index}].paths[${pathIndex}]`);

    if (seenPaths.has(normalizedPath)) {
      throw new Error(`redirects[${index}].paths contains a duplicate path: ${normalizedPath}`);
    }

    seenPaths.add(normalizedPath);
    return normalizedPath;
  });

  return {
    documentId,
    name,
    paths,
    target: normalizeTargetValue(entry.target, `redirects[${index}].target`),
    statusCode,
    hosts: DEFAULT_HOSTS,
    preserveQueryString: false,
  };
}

function buildManagedRules(redirects) {
  const seenMatchKeys = new Map();

  for (const redirect of redirects) {
    for (const path of redirect.paths) {
      const matchKey = `${redirect.hosts.join(',')}::${path}`;
      const previous = seenMatchKeys.get(matchKey);

      if (previous) {
        throw new Error(
          `Duplicate enabled redirect path detected for ${path}: ${previous} and ${redirect.name}. Sanity redirects must not overlap exactly.`
        );
      }

      seenMatchKeys.set(matchKey, redirect.name);
    }
  }

  return redirects.map((redirect) => ({
    ref: `${MANAGED_REF_PREFIX}${sanitizeRefSegment(redirect.documentId)}`,
    description: redirect.name,
    action: 'redirect',
    expression: buildExpression({
      hosts: redirect.hosts,
      paths: redirect.paths,
    }),
    enabled: true,
    action_parameters: {
      from_value: {
        status_code: redirect.statusCode,
        target_url: {
          value: redirect.target,
        },
        preserve_query_string: redirect.preserveQueryString,
      },
    },
  }));
}

async function loadSanityRedirects() {
  const response = await fetch(buildSanityQueryUrl(SANITY_REDIRECTS_QUERY), {
    headers: SANITY_API_TOKEN
      ? {
          Authorization: `Bearer ${SANITY_API_TOKEN}`,
        }
      : undefined,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const details =
      payload?.error?.description ||
      payload?.error ||
      payload?.message ||
      `${response.status} ${response.statusText}`;
    throw new Error(`Sanity query failed: ${details}`);
  }

  const result = payload?.result;

  if (!Array.isArray(result)) {
    throw new Error('Sanity redirects query returned an unexpected result.');
  }

  return result.map((entry, index) => normalizeSanityRedirect(entry, index));
}

async function apiRequest({ method, pathname, token, body }) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    const details =
      payload?.errors?.map((error) => `${error.code}: ${error.message}`).join('; ') ||
      `${response.status} ${response.statusText}`;
    const error = new Error(`Cloudflare API request failed: ${details}`);
    error.status = response.status;
    throw error;
  }

  return payload.result;
}

async function getEntrypointRuleset(zoneId, token) {
  try {
    return await apiRequest({
      method: 'GET',
      pathname: `/zones/${zoneId}/rulesets/phases/${PHASE}/entrypoint`,
      token,
    });
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
}

function splitExistingRules(rules = []) {
  const managed = [];
  const unmanaged = [];

  for (const rule of rules) {
    if (typeof rule?.ref === 'string' && rule.ref.startsWith(MANAGED_REF_PREFIX)) {
      managed.push(rule);
      continue;
    }

    unmanaged.push(rule);
  }

  return { managed, unmanaged };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const redirects = await loadSanityRedirects();
  const managedRules = buildManagedRules(redirects);

  console.log(
    `Loaded ${redirects.length} enabled Sanity redirect document${
      redirects.length === 1 ? '' : 's'
    } from ${SANITY_PROJECT_ID}/${SANITY_DATASET} and generated ${managedRules.length} managed Cloudflare rule${
      managedRules.length === 1 ? '' : 's'
    }.`
  );
  logRuleList(
    'Generated managed rules',
    redirects.map(
      (redirect) => `${redirect.name} | ${redirect.statusCode} | ${redirect.paths.join(', ')} -> ${redirect.target}`
    )
  );

  if (!options.apply) {
    console.log('Validation succeeded. No Cloudflare changes were made.');
    return;
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!token) {
    throw new Error('CLOUDFLARE_API_TOKEN is required when using --apply.');
  }

  if (!zoneId) {
    throw new Error('CLOUDFLARE_ZONE_ID is required when using --apply.');
  }

  const existing = await getEntrypointRuleset(zoneId, token);
  const { managed: existingManagedRules, unmanaged: existingUnmanagedRules } = splitExistingRules(existing?.rules);
  const finalRules = PRESERVE_UNMANAGED_RULES
    ? [...managedRules, ...existingUnmanagedRules.map(sanitizeRuleForPut)]
    : managedRules;
  const description = existing?.description || 'Redirect rules managed by GitHub Actions in preview.tcha-mn.com';

  console.log(
    `Cloudflare entry point currently has ${existingManagedRules.length} managed and ${existingUnmanagedRules.length} unmanaged rule${
      existingUnmanagedRules.length === 1 ? '' : 's'
    }.`
  );
  console.log(
    `Applying ${managedRules.length} managed rule${managedRules.length === 1 ? '' : 's'}${
      PRESERVE_UNMANAGED_RULES
        ? ` and preserving ${existingUnmanagedRules.length} unmanaged rule${existingUnmanagedRules.length === 1 ? '' : 's'}`
        : ''
    }.`
  );
  if (PRESERVE_UNMANAGED_RULES) {
    logRuleList(
      'Preserved unmanaged Cloudflare rules',
      existingUnmanagedRules.map((rule) => summarizeRule(rule))
    );
  }

  const likelyOverlaps = findLikelyOverlaps(managedRules, existingUnmanagedRules);
  if (likelyOverlaps.length > 0) {
    console.warn('Likely overlaps detected between generated managed rules and preserved unmanaged Cloudflare rules:');
    for (const overlap of likelyOverlaps) {
      console.warn(
        `- managed "${overlap.managedRule.description}" overlaps unmanaged "${overlap.unmanagedRule.description || overlap.unmanagedRule.ref}" on ${overlap.overlappingPaths.join(', ')}`
      );
    }
  }

  const updated = await apiRequest({
    method: 'PUT',
    pathname: `/zones/${zoneId}/rulesets/phases/${PHASE}/entrypoint`,
    token,
    body: {
      description,
      rules: finalRules,
    },
  });

  console.log(`Cloudflare redirect ruleset updated successfully: ${updated.id} (version ${updated.version}).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
