// Cloudflare Containers shim: routes every request to the FastAPI container.
// The container is the app (see app/); this Worker only manages its lifecycle.
// Secrets (GITHUB_TOKEN) live on this Worker and are passed into the container
// as env vars — they never appear in wrangler.jsonc or the image.
import { Container, getContainer } from '@cloudflare/containers';

export class CatalogService extends Container {
	defaultPort = 8080;
	sleepAfter = '10m'; // scale-to-zero: stop the instance after 10 idle minutes

	constructor(ctx, env) {
		super(ctx, env);
		this.envVars = {
			GITHUB_TOKEN: env.GITHUB_TOKEN ?? '',
			GITHUB_REPO: env.GITHUB_REPO ?? '',
			CATALOG_BRANCH: env.CATALOG_BRANCH ?? 'main',
			ALLOWED_ORIGINS: env.ALLOWED_ORIGINS ?? '',
			// Catalog-only deploy: point HOMR_CMD at a nonexistent binary so
			// POST /omr returns its clean 503 instead of uvx-downloading homr
			// (licensing unverified, spec §14; revisit with the OMR milestone).
			HOMR_CMD: env.HOMR_CMD ?? 'homr-not-installed',
		};
	}
}

export default {
	async fetch(request, env) {
		return getContainer(env.CATALOG_SERVICE).fetch(request);
	},
};
