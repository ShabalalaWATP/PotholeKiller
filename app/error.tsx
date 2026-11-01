"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main style={{ maxWidth: 600, margin: "12vh auto", padding: 30 }}><p className="eyebrow mint-text">SCANNER TEMPORARILY DOWN</p><h1 style={{ fontSize: 38, margin: "15px 0" }}>A bump in the road.</h1><p className="muted">Your saved collection stays in this browser. Try loading the hunt again.</p><button className="button button-yellow" style={{ marginTop: 25 }} onClick={reset}>Try again</button></main>;
}
