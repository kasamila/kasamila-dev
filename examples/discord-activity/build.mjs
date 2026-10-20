import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
await build({entryPoints:[fileURLToPath(new URL('./vendor-entry.mjs',import.meta.url))],bundle:true,format:'esm',target:'es2022',
  outfile:fileURLToPath(new URL('./portal/web/portal/discord-activity/discord-sdk.js',import.meta.url)),minify:true,legalComments:'eof'});
