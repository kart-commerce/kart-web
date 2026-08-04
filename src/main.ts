import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { MSW_ENABLED } from './testing/msw-enabled';

async function main(): Promise<void> {
  if (MSW_ENABLED) {
    const { worker } = await import('./testing/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
  await bootstrapApplication(App, appConfig);
}

main().catch((err) => console.error(err));
