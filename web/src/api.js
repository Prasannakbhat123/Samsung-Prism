async function request(method, path, body) {
  const opts = { method, headers: {} }
  if (body instanceof FormData) {
    opts.body = body
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(`/api${path}`, opts)
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`)
  return data
}

const enc = encodeURIComponent
const frameUrl = (project, frame) => `/projects/${enc(project)}/frames/${enc(frame)}`

export const api = {
  status: () => request('GET', '/status'),
  projects: () => request('GET', '/projects'),
  project: (name) => request('GET', `/projects/${enc(name)}`),
  createProject: (name, files) => {
    const form = new FormData()
    form.append('name', name)
    for (const f of files) form.append('files', f, f.name)
    return request('POST', '/projects', form)
  },
  deleteProject: (name) => request('DELETE', `/projects/${enc(name)}`),
  exportUrl: (name) => `/api/projects/${enc(name)}/export`,

  imageUrl: (project, frame) => `/api${frameUrl(project, frame)}/image`,
  annotation: (project, frame) => request('GET', `${frameUrl(project, frame)}/annotation`),
  saveAnnotation: (project, frame, objects) =>
    request('PUT', `${frameUrl(project, frame)}/annotation`, { objects }),

  ritmClick: (project, frame, x, y, positive) =>
    request('POST', `${frameUrl(project, frame)}/ritm/click`, { x, y, positive }),
  ritmUndo: (project, frame) => request('POST', `${frameUrl(project, frame)}/ritm/undo`),
  ritmReset: () => request('POST', '/ritm/reset'),

  propagate: (project, frame, count, references) =>
    request('POST', `${frameUrl(project, frame)}/propagate`, { count, references }),
}
