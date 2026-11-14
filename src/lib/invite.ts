// Group and event invite links carry the name and the code: /app/community/join/therenewgym-launch-7KQ2MX9P
// (only the code after the last "-" matters, so renaming the group never breaks a link already shared)

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')

export const invitePath = (name: string, code: string) => `/app/community/join/${slugify(name) ? `${slugify(name)}-` : ''}${code}`
export const inviteLink = (name: string, code: string) => `${typeof location !== 'undefined' ? location.origin : ''}${invitePath(name, code)}`
