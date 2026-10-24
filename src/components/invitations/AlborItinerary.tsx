'use client';

import type { BuilderConfig, InvitationParsed } from '@/lib/types';
import { paradiseReferenceClock } from '@/lib/paradise-reference';
import AlborOriginalIcon from './AlborOriginalIcon';
import styles from './AlborItinerary.module.css';

const roles = ['ceremony', 'firstDance', 'toast', 'dinner', 'party', 'cake', 'farewell'] as const;

/** Euforia's horizontal / alternating vertical itinerary, using archived originals. */
export default function AlborItinerary({ items, config, preview }: {
  items: InvitationParsed['itinerary'];
  config: BuilderConfig;
  preview: boolean;
}) {
  if (!items.length) return null;

  return <section className={styles.section} data-albor-section="itinerary">
    <h2 className={styles.heading}>Itinerario</h2>
    <ol className={styles.list}>
      {items.map((item, index) => {
        const clock = paradiseReferenceClock(item.time);
        return <li className={styles.item} key={index} data-albor-itinerary-item>
        <div className={styles.iconArea}>
          <AlborOriginalIcon
            role={roles[index] ?? 'party'}
            sectionKey={`itinerary-${index}`}
            config={config}
            src={item.icon}
            colors={item.iconColors}
            speed={item.iconSpeed}
            size={100}
            active={!preview}
          />
        </div>
        <div className={styles.details}>
          {clock && <time className={styles.itemTime} dateTime={item.time.slice(0, 5)}>{clock}</time>}
          {item.label && <h3 className={styles.itemTitle}>{item.label}</h3>}
          {item.place && <p className={styles.itemExtra}>{item.place}</p>}
          {item.note && <p className={`${styles.itemExtra} ${styles.itemNote}`}>{item.note}</p>}
          {item.duration && <p className={styles.itemExtra}>{item.duration}</p>}
        </div>
      </li>;
      })}
    </ol>
  </section>;
}
