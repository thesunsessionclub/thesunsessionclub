(function(){
  const CANONICAL = {
    rubzz: {
      slug: 'rubzz',
      name: 'RUBZZ',
      genres: ['Techno', 'Underground', 'Minimal'],
      image: '/assets/img/rubzz.png',
      bio: 'RUBZZ es una de las caras centrales del sonido Sunsesh. Su seleccion se mueve entre techno hipnotico, tension underground y grooves minimalistas pensados para sostener la pista durante horas.',
      experience: [
        'Residente de The Sun Session Club',
        'Curaduria de lineups para noches techno y warehouse',
        'Sets de largo formato con enfoque en tension, energia y narrativa',
        'Participaciones en showcases y eventos independientes de la region'
      ],
      equipment: [
        'Pioneer CDJ-3000',
        'Allen & Heath Xone:96',
        'Roland TR-8S',
        'Control y procesamiento modular en vivo'
      ],
      email: 'rubzz@sunsessionclub.com',
      phone: '+52 686 109 5015'
    },
    merme: {
      slug: 'merme',
      name: 'MERME',
      genres: ['House', 'Deep Tech', 'Progressive'],
      image: '/assets/img/merme.png',
      bio: 'MERME construye sets con profundidad, elegancia y movimiento constante. Su seleccion mezcla house, deep tech y texturas progresivas para llevar la noche a una vibra mas sensual y envolvente.',
      experience: [
        'Residente de The Sun Session Club',
        'Warm ups y cierres enfocados en groove progresivo',
        'Participacion en eventos boutique y formatos sunset',
        'Desarrollo de identidad sonora para experiencias inmersivas'
      ],
      equipment: [
        'Pioneer CDJ-3000',
        'Pioneer DJM-900NXS2',
        'Ableton Live para edits y stems',
        'Monitoreo hibrido para performance extendido'
      ],
      email: 'merme@sunsessionclub.com',
      phone: '+52 686 516 0774'
    },
    drack: {
      slug: 'drack',
      name: 'DRACK',
      genres: ['Tech House', 'Melodic', 'Tribal'],
      image: '/assets/img/drack.png',
      bio: 'DRACK empuja la energia con percusion tribal, bajos pesados y construcciones melodicas que conectan directo con la pista. Su enfoque cruza tech house y tension festivalera sin perder identidad underground.',
      experience: [
        'Residente de The Sun Session Club',
        'Curaduria de sets peak time y cierres de alto impacto',
        'Participaciones en fiestas independientes y venues alternativos',
        'Exploracion de sonidos tribales, melodic y tech house'
      ],
      equipment: [
        'Pioneer CDJ-3000',
        'Pioneer DJM-V10',
        'Elektron Digitakt',
        'Sampling y percusion para transiciones en vivo'
      ],
      email: 'drack@sunsessionclub.com',
      phone: '+52 686 123 4567'
    }
  };

  const NUMERIC_KEY_MAP = { '1': 'rubzz', '2': 'merme', '3': 'drack' };

  function toText(value){
    return String(value == null ? '' : value).trim();
  }

  function normalizeKey(value){
    return toText(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^dj\s+/i, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function parseList(value){
    if (Array.isArray(value)) return value.map(toText).filter(Boolean);
    const text = toText(value);
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(toText).filter(Boolean);
    } catch {}
    return text.split(/\r?\n|[,;]+/).map(toText).filter(Boolean);
  }

  function parseGenres(record){
    const candidates = []
      .concat(Array.isArray(record?.genres_list) ? record.genres_list.map((item) => item && item.name) : [])
      .concat(Array.isArray(record?.genres) ? record.genres : [])
      .concat(parseList(record?.genre));
    return Array.from(new Set(candidates.map(toText).filter(Boolean)));
  }

  function extractSocials(record){
    const socialLinks = parseList(record?.social_links);
    const findBy = (regex) => socialLinks.find((item) => regex.test(item)) || '';
    return {
      instagram: toText(record?.instagram) || findBy(/instagram\.com/i),
      spotify: toText(record?.spotify) || findBy(/spotify\.com/i),
      soundcloud: toText(record?.soundcloud) || findBy(/soundcloud\.com/i),
      youtube: toText(record?.youtube) || findBy(/youtu(be\.com|\.be)/i)
    };
  }

  function resolveArtistKey(record){
    const fromNumeric = NUMERIC_KEY_MAP[toText(record?.id)];
    if (fromNumeric) return fromNumeric;
    const fromArtist = normalizeKey(record?.artist);
    if (CANONICAL[fromArtist]) return fromArtist;
    const fromName = normalizeKey(record?.name);
    if (CANONICAL[fromName]) return fromName;
    const fromSlug = normalizeKey(record?.slug);
    if (CANONICAL[fromSlug]) return fromSlug;
    return '';
  }

  function mergeArtist(record){
    const source = record && typeof record === 'object' ? record : {};
    const key = resolveArtistKey(source);
    const canon = key ? CANONICAL[key] : {};
    const genres = parseGenres(source);
    const socials = extractSocials(source);
    const merged = {
      ...canon,
      ...source,
      id: source.id != null ? source.id : (canon.slug || key || ''),
      slug: toText(source.slug) || canon.slug || key || '',
      name: toText(source.name) || canon.name || '',
      genres: genres.length ? genres : (canon.genres || []),
      genre: genres.length ? genres.join(', ') : ((canon.genres || []).join(', ')),
      image: toText(source.image) || toText(source.profile_image) || canon.image || '',
      profile_image: toText(source.profile_image) || toText(source.image) || canon.image || '',
      bio: toText(source.bio) || canon.bio || '',
      experience: parseList(source.experience).length ? parseList(source.experience) : (canon.experience || []),
      equipment: parseList(source.equipment).length ? parseList(source.equipment) : (canon.equipment || []),
      email: toText(source.email) || canon.email || '',
      phone: toText(source.phone) || canon.phone || '',
      instagram: socials.instagram || canon.instagram || '',
      spotify: socials.spotify || canon.spotify || '',
      soundcloud: socials.soundcloud || canon.soundcloud || '',
      youtube: socials.youtube || canon.youtube || ''
    };
    merged.social_links = [merged.instagram, merged.spotify, merged.soundcloud, merged.youtube].filter(Boolean).join(', ');
    return merged;
  }

  function canonicalArtists(){
    return Object.keys(CANONICAL).map((key) => mergeArtist({ slug: key }));
  }

  function profileUrl(record){
    const artist = mergeArtist(record);
    const params = [];
    if (artist.id) params.push(`id=${encodeURIComponent(String(artist.id))}`);
    if (artist.slug) params.push(`artist=${encodeURIComponent(artist.slug)}`);
    return `artistas.html${params.length ? `?${params.join('&')}` : ''}`;
  }

  window.__SSC_ARTIST_CANON = CANONICAL;
  window.__SSC_ARTIST_KEY_FROM_ANY = resolveArtistKey;
  window.__SSC_MERGE_ARTIST = mergeArtist;
  window.__SSC_CANONICAL_ARTISTS = canonicalArtists;
  window.__SSC_ARTIST_PROFILE_URL = profileUrl;
})();
