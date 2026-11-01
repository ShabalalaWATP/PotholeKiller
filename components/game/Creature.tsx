import { useId } from 'react';

export type CreatureFamily = 'gremlin' | 'crackling' | 'puddle' | 'beast';

type CreatureProps = {
  family?: CreatureFamily;
  className?: string;
  mood?: 'grumpy' | 'happy' | 'surprised';
  title?: string;
};

const colours = {
  gremlin: { body: '#9C88E9', light: '#C7B9FF', shade: '#6C59AF', cheek: '#FF947E' },
  crackling: { body: '#FF8467', light: '#FFB49B', shade: '#C75349', cheek: '#FFD84D' },
  puddle: { body: '#54CDB9', light: '#A1F0D2', shade: '#269586', cheek: '#FFA698' },
  beast: { body: '#7F94AD', light: '#B7C9D9', shade: '#4A617C', cheek: '#FF977E' },
};

/** Original reusable road creature artwork. Family and rarity are purely cosmetic. */
export function Creature({ family = 'gremlin', className = '', mood = 'grumpy', title }: CreatureProps) {
  const id = useId();
  const c = colours[family];
  const isCrack = family === 'crackling';
  const isPuddle = family === 'puddle';
  const isBeast = family === 'beast';
  const label = title ?? `${family} pothole creature`;

  return (
    <svg className={`creature creature-${family} ${className}`} viewBox="0 0 360 340" fill="none" role="img" aria-labelledby={id}>
      <title id={id}>{label}</title>
      <ellipse cx="183" cy="305" rx={isPuddle ? '134' : '111'} ry="20" fill="#091C30" opacity=".15" />
      {isPuddle && <path d="M43 296c-22-19 34-32 62-26 12-21 43-27 74-14 42-19 77-9 82 9 36-9 83 11 62 29-11 10-59 7-83 13-39 15-68-3-105 3-37 7-72 8-92-14Z" fill="#77DFCE" stroke="#123044" strokeWidth="5" />}
      <g className="creature-body">
        <g stroke="#123044" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round">
          <path d="m110 262-12 29c-18 3-29 9-24 17 12 13 53 12 66 0l8-32M215 273l12 32c11 13 51 12 60 2 8-9-10-16-26-18l-9-28" fill={c.shade} />
          <path d="M90 159c-26-7-42 8-46 27-5 24 2 45 15 43 11-1 10-16 16-23l17 8M270 158c27-8 42 10 47 28 6 24-4 42-16 42-10-1-10-18-15-24l-20 10" fill={c.body} />
          <path d={isCrack
            ? 'm86 127 14-37 35 2 19-28 35 17 37-17 19 34 29 7 10 35-9 22 15 37-18 37-5 27-36 20-50 13-53-10-38-23-10-34-9-34 14-34Z'
            : 'M89 128c-4-42 33-73 73-65 18-17 54-16 71 5 43-1 66 34 57 72 15 24 13 62-2 89-7 48-48 66-106 65-60 1-103-20-105-67-16-25-16-72 12-99Z'} fill={c.body} />
          <path d="M109 129c2-29 25-47 52-44M187 81c14-4 28 0 36 10" stroke={c.light} strokeWidth="14" />
          {!isBeast && !isPuddle && <><path d="m97 101-17-31 43 9M250 90l27-29 3 50" fill={c.light} /><path d="m165 67-4-23 25 17" fill={c.body} /></>}
          {isPuddle && <><path d="M107 85c-19-23-4-44 7-55 4 17 23 31 15 49" fill={c.light} /><path d="M249 87c16-12 27-13 30-33 14 16 18 39-4 53" fill={c.light} /></>}
          <path d="M107 235c8-23 40-36 76-34 39 0 70 16 71 38-1 24-30 39-73 39-40-1-70-15-74-43Z" fill={c.shade} stroke="none" />
          <path d="m129 235 19-14 26 7 24-8 28 15-14 15-30 6-30-6Z" fill="#193348" strokeWidth="4" />
          <path d="m146 221-8-14 12-10M213 246l10 10-7 10M177 255l-5 11" stroke="#193348" strokeWidth="4" />
        </g>
        <g className="creature-eyes">
          <ellipse cx="140" cy="151" rx="29" ry="34" fill="#FFF9E9" stroke="#123044" strokeWidth="5" />
          <ellipse cx="222" cy="151" rx="29" ry="34" fill="#FFF9E9" stroke="#123044" strokeWidth="5" />
          <ellipse cx={mood === 'surprised' ? 140 : 146} cy="155" rx={mood === 'surprised' ? 8 : 11} ry="16" fill="#123044" />
          <ellipse cx={mood === 'surprised' ? 222 : 216} cy="155" rx={mood === 'surprised' ? 8 : 11} ry="16" fill="#123044" />
          <circle cx="143" cy="149" r="4" fill="white" /><circle cx="213" cy="149" r="4" fill="white" />
          {mood === 'grumpy' && <><path d="m111 119 49 10M204 129l46-11" stroke="#123044" strokeWidth="9" strokeLinecap="round" /></>}
          <ellipse cx="107" cy="184" rx="14" ry="8" fill={c.cheek} /><ellipse cx="255" cy="184" rx="14" ry="8" fill={c.cheek} />
          {mood === 'surprised'
            ? <ellipse cx="182" cy="190" rx="12" ry="15" fill="#123044" />
            : <><path d={mood === 'happy' ? 'M153 184q29 35 58-1' : 'M158 190q24 20 48-2'} fill="#123044" stroke="#123044" strokeWidth="5" strokeLinecap="round" /><path d="m170 192 6 11 9-10m9-1 6 9 6-12" fill="#FFF9E9" /></>}
        </g>
        <g fill={c.light}>
          <path d="m95 219 6-10 7 12Z" /><circle cx="258" cy="211" r="5" /><circle cx="247" cy="266" r="4" /><path d="m125 272 8-7 7 9Z" />
        </g>
        {isCrack && <path d="m181 88-10 18 15 16-10 18M264 186l-14 10 12 12" stroke="#934442" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
        {isBeast && <g stroke="#123044" strokeWidth="6" strokeLinejoin="round"><path d="m147 83 29-66c3-6 12-6 15 0l27 66" fill="#FF7852" /><path d="m165 43 37 0 7 18h-52Z" fill="#FFF6DC" stroke="none" /><path d="M137 83h91l10 13H126Z" fill="#FF7852" /><path d="m181 25-8 17" stroke="#FFAD82" strokeWidth="5" /></g>}
      </g>
      <g className="creature-sparkles" stroke="#FFD84D" strokeWidth="5" strokeLinecap="round"><path d="M42 95v16m-8-8h16M311 123v14m-7-7h14" /><path d="m68 256 3 3m232-3 3-3" /></g>
    </svg>
  );
}

export default Creature;
