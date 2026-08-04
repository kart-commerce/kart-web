import { TestBed } from '@angular/core/testing';

import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../config/app-config';
import { RealtimeConnectionManager } from './realtime-connection-manager';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();
  readonly sent: string[] = [];

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, handler: (event: unknown) => void): void {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.emit('close', {});
  }

  emit(type: string, event: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) {
      handler(event);
    }
  }
}

describe('RealtimeConnectionManager', () => {
  let manager: RealtimeConnectionManager;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    TestBed.configureTestingModule({ providers: [{ provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG }] });
    manager = TestBed.inject(RealtimeConnectionManager);
    manager.webSocketFactory = (url) => new FakeWebSocket(url) as unknown as WebSocket;
  });

  afterEach(() => {
    manager.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('connects and reports "connected" once the socket opens', () => {
    manager.connect();
    expect(manager.status()).toBe('connecting');

    FakeWebSocket.instances[0].emit('open', {});
    expect(manager.status()).toBe('connected');
  });

  it('routes an inbound message to the subscriber of its own channel only', () => {
    const cartMessages: unknown[] = [];
    const priceMessages: unknown[] = [];
    manager.subscribe('cart-sync').subscribe((message) => cartMessages.push(message));
    manager.subscribe('price-updates').subscribe((message) => priceMessages.push(message));

    FakeWebSocket.instances[0].emit('open', {});
    FakeWebSocket.instances[0].emit('message', {
      data: JSON.stringify({ channel: 'cart-sync', data: { itemCount: 3 } }),
    });

    expect(cartMessages).toEqual([{ itemCount: 3 }]);
    expect(priceMessages).toEqual([]);
  });

  it('sends a subscribe message for every channel once the socket opens', () => {
    manager.subscribe('order-status');
    FakeWebSocket.instances[0].emit('open', {});

    expect(FakeWebSocket.instances[0].sent).toContain(
      JSON.stringify({ type: 'subscribe', channel: 'order-status' }),
    );
  });

  it('degrades to "disconnected" then reconnects with backoff after a drop', () => {
    jasmine.clock().install();

    manager.connect();
    FakeWebSocket.instances[0].emit('open', {});
    expect(manager.status()).toBe('connected');

    FakeWebSocket.instances[0].emit('close', {});
    expect(manager.status()).toBe('disconnected');

    jasmine.clock().tick(1000);
    expect(FakeWebSocket.instances.length).toBe(2);
    expect(manager.status()).toBe('reconnecting');

    FakeWebSocket.instances[1].emit('open', {});
    expect(manager.status()).toBe('connected');
  });
});
