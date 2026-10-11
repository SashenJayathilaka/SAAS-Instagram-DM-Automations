import Link from 'next/link';
import styles from './docs.module.css';
export function TutorialVideo() {
 return <figure className={styles.video}>
  <iframe src="https://www.youtube-nocookie.com/embed/SSOYGbfwLUQ" title="AP3K tutorial: create an Instagram comment-to-DM automation" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
  <figcaption>Watch the AP3K walkthrough: choose a post, set keywords, add a public reply and DM, then review and publish. <a href="https://www.youtube.com/watch?v=SSOYGbfwLUQ" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a> · <Link href="/tutorials/instagram-comment-to-dm">Open the video tutorial →</Link></figcaption>
 </figure>;
}
