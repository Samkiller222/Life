import type { Module } from '../modules'

export default function ComingSoon({ module }: { module: Module }) {
  return (
    <>
      <h1>{module.name}</h1>
      <p>{module.summary}</p>
      <p className="notice">
        Not built yet. Done when: {module.doneWhen}
      </p>
    </>
  )
}
