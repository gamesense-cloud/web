import config from '../../../config/index.js';

export function notFound(_req, res) {
  res.status(404).json({ error: 'no such endpoint' });
}

/**
 * One error shape for the whole API: { error, errors? }.
 * Messages are only passed through when the thrower marked them `expose` —
 * anything else becomes a flat 500 so internals never reach a client.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? err.statusCode ?? 500;

  if (status >= 500 && !config.isTest) {
    console.error(err);
  }

  const body = {
    error: err.expose || status < 500 ? err.message : 'something went wrong on our side',
  };
  if (err.errors) body.errors = err.errors;
  if (!config.isProduction && status >= 500) body.stack = err.stack;

  res.status(status).json(body);
}

/** Wraps an async handler so a rejected promise reaches errorHandler. */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export default { notFound, errorHandler, asyncHandler };
