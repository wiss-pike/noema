export function onRequestGet({ request, env }) {
  return env.BRIEFING.fetch(request);
}
