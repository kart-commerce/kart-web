import { HttpErrorResponse } from '@angular/common/http';
import { extractErrorMessage } from './problem';

describe('extractErrorMessage', () => {
  it('returns the Problem message when present', () => {
    const error = new HttpErrorResponse({ error: { code: 'invalid_credentials', message: 'Bad password' } });
    expect(extractErrorMessage(error, 'fallback')).toBe('Bad password');
  });

  it('falls back when the error is not a Problem-shaped HttpErrorResponse', () => {
    expect(extractErrorMessage(new Error('network down'), 'fallback')).toBe('fallback');
  });

  it('falls back when the HttpErrorResponse body has no message field', () => {
    const error = new HttpErrorResponse({ error: { code: 'oops' } });
    expect(extractErrorMessage(error, 'fallback')).toBe('fallback');
  });

  it('falls back when the HttpErrorResponse body is not an object', () => {
    const error = new HttpErrorResponse({ error: 'plain text error' });
    expect(extractErrorMessage(error, 'fallback')).toBe('fallback');
  });
});
