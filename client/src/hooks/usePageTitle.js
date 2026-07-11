import { useEffect } from 'react'

const BASE = 'FightMarketing'

/** Zet de browsertab-titel; herstelt de standaardtitel bij unmount. */
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE}` : `${BASE} — Fight gear & clubshops voor vechtsportscholen`
    return () => { document.title = `${BASE} — Fight gear & clubshops voor vechtsportscholen` }
  }, [title])
}
