import { TestBed } from '@angular/core/testing';
import { SessionBroadcastService } from './session-broadcast.service';

describe('SessionBroadcastService', () => {
  let service: SessionBroadcastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionBroadcastService);
  });

  it('posts messages onto the kart-session BroadcastChannel', (done) => {
    const externalChannel = new BroadcastChannel('kart-session');
    externalChannel.onmessage = (event) => {
      expect(event.data).toEqual({ type: 'logout' });
      externalChannel.close();
      done();
    };

    service.post({ type: 'logout' });
  });

  it('surfaces a message posted externally through messages$', (done) => {
    const externalChannel = new BroadcastChannel('kart-session');

    service.messages$.subscribe((message) => {
      expect(message).toEqual({ type: 'login' });
      externalChannel.close();
      done();
    });

    externalChannel.postMessage({ type: 'login' });
  });
});
