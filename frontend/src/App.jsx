import { useEffect, useState } from 'react'
import {
  ArrowRight, Check, ChevronDown, ClipboardList, Heart, LoaderCircle,
  LogOut, MapPin, PawPrint, Plus, Search, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import api, { clearSession, saveSession } from './api'
import './App.css'

const speciesOptions = ['Todos', 'Cão', 'Gato', 'Outro']
const sizeLabels = { small: 'Pequeno', medium: 'Médio', large: 'Grande' }

function App() {
  const [petResults, setPetResults] = useState({ filterKey: null, items: [] })
  const [filters, setFilters] = useState({ species: 'Todos', size: 'Todos', city: '' })
  const [citySearch, setCitySearch] = useState('')
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('petlume-user')) } catch { return null }
  })
  const [view, setView] = useState('explore')
  const [modal, setModal] = useState(null)
  const [pendingPet, setPendingPet] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const filterKey = JSON.stringify(filters)
  const currentPetResults = petResults.filterKey === filterKey ? petResults : null
  const pets = currentPetResults?.items ?? []
  const loading = view === 'explore' && currentPetResults === null

  useEffect(() => {
    if (view !== 'explore') return undefined
    let active = true
    const params = Object.fromEntries(Object.entries(JSON.parse(filterKey)).filter(([, value]) => value && value !== 'Todos'))
    api.get('/pets', { params })
      .then(({ data }) => { if (active) { setPetResults({ filterKey, items: data }); setLoadError('') } })
      .catch(() => { if (active) setLoadError('Não foi possível carregar os pets. Confira se a API está ativa.') })
    return () => { active = false }
  }, [filterKey, view])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 3600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  async function refreshPets() {
    const params = Object.fromEntries(Object.entries(JSON.parse(filterKey)).filter(([, value]) => value && value !== 'Todos'))
    const { data } = await api.get('/pets', { params })
    setPetResults({ filterKey, items: data })
  }

  function openAdoption(pet) {
    if (!user) {
      setPendingPet(pet)
      setModal({ type: 'auth', mode: 'register' })
    } else if (user.role !== 'adopter') {
      setNotice('Entre com uma conta de adotante para enviar uma solicitação.')
    } else setModal({ type: 'adoption', pet })
  }

  async function handleAuth(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const mode = modal.mode
    const payload = {
      email: form.get('email'), password: form.get('password'),
      ...(mode === 'register' ? { name: form.get('name'), role: form.get('role') } : {}),
    }
    setBusy(true)
    try {
      const { data } = await api.post(`/auth/${mode}`, payload)
      saveSession(data)
      setUser(data.user)
      setModal(null)
      setNotice(`Boas-vindas${data.user.name ? `, ${data.user.name.split(' ')[0]}` : ''}!`)
      if (pendingPet && data.user.role === 'adopter') setModal({ type: 'adoption', pet: pendingPet })
      else if (mode === 'register' && data.user.role === 'donor') {
        setView('mine')
        setModal({ type: 'pet' })
      } else if (data.user.role === 'donor') setView('mine')
      setPendingPet(null)
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Não foi possível acessar sua conta.')
    } finally { setBusy(false) }
  }

  async function handlePetSubmit(event) {
    event.preventDefault()
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
    payload.age_years = Number(payload.age_years)
    setBusy(true)
    try {
      await api.post('/pets', payload)
      setModal(null)
      setView('explore')
      await refreshPets()
      setNotice('Anúncio publicado. Que bom que mais um pet está a caminho de um lar!')
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Não foi possível publicar o anúncio.')
    } finally { setBusy(false) }
  }

  async function handleAdoptionSubmit(event) {
    event.preventDefault()
    const message = new FormData(event.currentTarget).get('message')
    setBusy(true)
    try {
      await api.post(`/pets/${modal.pet.id}/adoptions`, { message })
      setModal(null)
      setView('adoptions')
      setNotice('Solicitação enviada ao doador.')
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Não foi possível enviar sua solicitação.')
    } finally { setBusy(false) }
  }

  function signOut() {
    clearSession()
    setUser(null)
    setView('explore')
    setNotice('Você saiu da sua conta.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" onClick={() => setView('explore')} aria-label="PetLume, início">
          <span className="brand-mark"><PawPrint size={21} strokeWidth={2.5} /></span>
          <span>petlume<span className="brand-period">.</span></span>
        </a>
        <nav className="main-nav" aria-label="Navegação principal">
          <button className={view === 'explore' ? 'nav-link active' : 'nav-link'} onClick={() => setView('explore')}>Encontrar um pet</button>
          {user && <button className={view === 'adoptions' ? 'nav-link active' : 'nav-link'} onClick={() => setView('adoptions')}>{user.role === 'donor' ? 'Solicitações' : 'Meus pedidos'}</button>}
          {user?.role === 'donor' && <button className={view === 'mine' ? 'nav-link active' : 'nav-link'} onClick={() => setView('mine')}>Meus anúncios</button>}
        </nav>
        <div className="account-actions">
          {user ? <><span className="account-name"><span className="account-dot" />{user.name.split(' ')[0]}</span><button className="icon-button" onClick={signOut} title="Sair da conta" aria-label="Sair da conta"><LogOut size={18} /></button></> : <><button className="text-button" onClick={() => setModal({ type: 'auth', mode: 'login' })}>Entrar</button><button className="button button-dark button-small" onClick={() => setModal({ type: 'auth', mode: 'register' })}>Criar conta <ArrowRight size={15} /></button></>}
        </div>
      </header>

      <main>
        {view === 'explore' && <>
          <section className="hero" id="inicio">
            <div className="hero-copy">
              <span className="eyebrow"><Sparkles size={14} /> Adoção responsável, com carinho</span>
              <h1>Um novo começo<br />pode ter <em>quatro patas.</em></h1>
              <p>Encontre seu companheiro entre pets que esperam por uma família como a sua.</p>
              <div className="hero-actions"><button className="button button-dark" onClick={() => document.getElementById('pets')?.scrollIntoView({ behavior: 'smooth' })}>Encontrar meu pet <ArrowRight size={17} /></button><button className="button button-light" onClick={() => user?.role === 'donor' ? setModal({ type: 'pet' }) : user ? setNotice('Anúncios são publicados por contas de doador.') : setModal({ type: 'auth', mode: 'register' })}><Plus size={17} /> Quero ajudar um pet</button></div>
              <div className="hero-trust"><span className="trust-avatars"><span>🐶</span><span>🐱</span><span>🐾</span></span><span><strong>Conexões que mudam vidas</strong><br />um encontro de cada vez</span></div>
            </div>
            <div className="hero-art" aria-label="Cão pronto para encontrar uma família"><img src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1300&q=90" alt="Cão caramelo olhando para a câmera" /><div className="photo-note"><span className="note-icon"><Heart size={16} fill="currentColor" /></span><span><strong>Amor não se compra.</strong><br />Se encontra.</span></div><div className="hero-stamp"><PawPrint size={23} /><span>adote<br />com amor</span></div></div>
          </section>
          <section className="content-section" id="pets">
            <div className="section-heading"><div><span className="eyebrow eyebrow-muted">A família pode começar aqui</span><h2>Pets esperando por você<span className="brand-period">.</span></h2></div><button className="location-chip" onClick={() => document.getElementById('city-filter')?.focus()}><MapPin size={16} /> Brasil <ChevronDown size={15} /></button></div>
            <div className="search-panel">
              <form className="search-field" onSubmit={(event) => { event.preventDefault(); setFilters({ ...filters, city: citySearch.trim() }) }}><Search size={19} /><input id="city-filter" aria-label="Buscar por cidade" value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="Busque por cidade" /><span className="field-divider" /><button className="search-submit" type="submit" aria-label="Buscar"><ArrowRight size={18} /></button></form>
              <div className="species-filter" role="group" aria-label="Filtrar por espécie">{speciesOptions.map((species) => <button key={species} className={filters.species === species ? 'species-option selected' : 'species-option'} onClick={() => setFilters({ ...filters, species })}>{species}</button>)}</div>
              <label className="size-select"><span>Porte</span><select value={filters.size} onChange={(event) => setFilters({ ...filters, size: event.target.value })}><option value="Todos">Todos</option><option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option></select><ChevronDown size={15} /></label>
            </div>
            <div className="results-line"><span>{loading ? 'Buscando companheiros...' : `${pets.length} ${pets.length === 1 ? 'pet' : 'pets'} para conhecer`}</span><span className="result-note"><ShieldCheck size={15} /> Adoção consciente começa com uma conversa</span></div>
            {loadError && <div className="inline-error">{loadError}</div>}
            {loading ? <div className="loading-state"><LoaderCircle className="spin" size={24} /> Encontrando novos amigos...</div> : pets.length ? <div className="pet-grid">{pets.map((pet, index) => <PetCard key={pet.id} pet={pet} index={index} onAdopt={() => openAdoption(pet)} />)}</div> : !loadError && <div className="empty-state"><span className="empty-paw"><PawPrint size={28} /></span><h3>Nenhum pet por aqui ainda</h3><p>Tente outra cidade ou volte em breve. Novos amigos aparecem por aqui todos os dias.</p>{user?.role === 'donor' && <button className="button button-dark" onClick={() => setModal({ type: 'pet' })}><Plus size={16} /> Publicar um anúncio</button>}</div>}
          </section>
          <section className="promise-band"><div className="promise-icon"><Heart size={20} /></div><div><strong>Adotar é um compromisso para a vida.</strong><p>Conheça a história, converse com o doador e escolha com o coração e a responsabilidade.</p></div><span className="promise-paw"><PawPrint size={60} /></span></section>
        </>}
        {view === 'mine' && <CollectionView title="Meus anúncios" endpoint="/pets/mine" empty="Você ainda não publicou nenhum pet." emptyAction="Publicar anúncio" onAction={() => setModal({ type: 'pet' })} onAdopt={openAdoption} />}
        {view === 'adoptions' && <AdoptionsView role={user?.role} onNotice={setNotice} />}
      </main>

      <footer className="site-footer"><a className="brand footer-brand" href="#inicio" onClick={() => setView('explore')}><span className="brand-mark"><PawPrint size={18} /></span><span>petlume<span className="brand-period">.</span></span></a><span>Feito para aproximar quem ama de quem precisa de um lar.</span><span>© 2026 PetLume</span></footer>
      {notice && <div className="toast" role="status"><Check size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={15} /></button></div>}
      {modal && <Modal onClose={() => setModal(null)}>{modal.type === 'auth' && <AuthForm mode={modal.mode} busy={busy} onSubmit={handleAuth} onModeChange={(mode) => setModal({ ...modal, mode })} onClose={() => setModal(null)} />}{modal.type === 'pet' && <PetForm busy={busy} onSubmit={handlePetSubmit} onClose={() => setModal(null)} />}{modal.type === 'adoption' && <AdoptionForm pet={modal.pet} busy={busy} onSubmit={handleAdoptionSubmit} onClose={() => setModal(null)} />}</Modal>}
    </div>
  )
}

function PetCard({ pet, index, onAdopt, showAction = true }) {
  return <article className="pet-card" style={{ '--card-delay': `${index * 70}ms` }}><div className="pet-image-wrap"><img className="pet-image" src={pet.image_url} alt={pet.name} loading="lazy" /><span className="pet-tag">{pet.species}</span></div><div className="pet-info"><div className="pet-title-line"><h3>{pet.name}</h3><span className="pet-age">{pet.age_years} {pet.age_years === 1 ? 'ano' : 'anos'}</span></div><p className="pet-breed">{pet.breed}</p><p className="pet-description">{pet.description}</p><div className="pet-meta"><span><MapPin size={14} />{pet.city}</span><span>{sizeLabels[pet.size]}</span></div><div className="pet-card-footer"><span className="donor-name"><span className="donor-avatar">{pet.donor_name?.[0]}</span> {pet.donor_name}</span>{showAction && <button className="adopt-link" onClick={onAdopt}>Conhecer <ArrowRight size={15} /></button>}</div></div></article>
}

function Modal({ children, onClose }) {
  useEffect(() => {
    function closeOnEscape(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-panel" role="dialog" aria-modal="true">{children}</section></div>
}

function ModalHeading({ eyebrow, title, subtitle, onClose }) {
  return <div className="modal-heading"><div><span className="eyebrow eyebrow-muted">{eyebrow}</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button modal-close" onClick={onClose} aria-label="Fechar"><X size={19} /></button></div>
}

function AuthForm({ mode, busy, onSubmit, onModeChange, onClose }) {
  return <><ModalHeading eyebrow="Seu próximo capítulo" title={mode === 'register' ? 'Crie sua conta' : 'Que bom ter você de volta'} subtitle="Uma comunidade unida por novos começos." onClose={onClose} /><form className="form-stack" onSubmit={onSubmit}>{mode === 'register' && <><label>Seu nome<input name="name" autoComplete="name" placeholder="Como podemos te chamar?" required minLength="2" /></label><label>Quero participar como<select name="role" defaultValue="adopter"><option value="adopter">Adotante</option><option value="donor">Doador de um pet</option></select></label></>}<label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@email.com" required /></label><label>Senha<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder="No mínimo 8 caracteres" required minLength={mode === 'register' ? 8 : undefined} /></label><button className="button button-dark form-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : null}{mode === 'register' ? 'Criar minha conta' : 'Entrar'} <ArrowRight size={17} /></button><p className="form-switch">{mode === 'register' ? 'Já faz parte da comunidade?' : 'Ainda não tem uma conta?'} <button type="button" onClick={() => onModeChange(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Entrar' : 'Criar conta'}</button></p></form></>
}

function PetForm({ busy, onSubmit, onClose }) {
  return <><ModalHeading eyebrow="Um novo encontro" title="Conte sobre o pet" subtitle="Uma boa história ajuda a encontrar a família certa." onClose={onClose} /><form className="form-stack form-grid" onSubmit={onSubmit}><label>Nome do pet<input name="name" placeholder="Ex.: Nina" required minLength="2" /></label><label>Espécie<select name="species" defaultValue="Cão"><option>Cão</option><option>Gato</option><option>Outro</option></select></label><label>Raça<input name="breed" placeholder="Ex.: Sem raça definida" required /></label><label>Porte<select name="size" defaultValue="medium"><option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option></select></label><label>Idade (anos)<input name="age_years" type="number" min="0" max="30" defaultValue="1" required /></label><label>Cidade<input name="city" placeholder="Ex.: São Paulo, SP" required /></label><label className="full-field">Foto do pet (URL)<input name="image_url" type="url" placeholder="https://..." required /></label><label className="full-field">Um pouco sobre ele<textarea name="description" rows="3" placeholder="Conte sobre a personalidade, saúde e rotina do pet." required minLength="10" /></label><button className="button button-dark form-submit full-field" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <Plus size={17} />} Publicar anúncio</button></form></>
}

function AdoptionForm({ pet, busy, onSubmit, onClose }) {
  return <><ModalHeading eyebrow={`Conheça ${pet.name}`} title="Dê o primeiro passo" subtitle="Conte ao doador por que você quer receber este pet na sua família." onClose={onClose} /><div className="modal-pet"><img src={pet.image_url} alt="" /><span><strong>{pet.name}</strong><small><MapPin size={13} /> {pet.city}</small></span></div><form className="form-stack" onSubmit={onSubmit}><label>Mensagem para o doador<textarea name="message" rows="4" minLength="10" maxLength="2000" placeholder="Fale um pouco sobre você, sua casa e os cuidados que pode oferecer." required /></label><button className="button button-dark form-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <Heart size={17} />} Enviar solicitação</button></form></>
}

function CollectionView({ title, endpoint, empty, emptyAction, onAction }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get(endpoint).then(({ data }) => setItems(data)).catch(() => setItems([])).finally(() => setLoading(false)) }, [endpoint])
  return <section className="collection-section"><div className="collection-heading"><span className="eyebrow eyebrow-muted">Seu espaço PetLume</span><h1>{title}<span className="brand-period">.</span></h1></div>{loading ? <div className="loading-state"><LoaderCircle className="spin" size={24} /> Carregando...</div> : items.length ? <div className="pet-grid">{items.map((pet, index) => <PetCard key={pet.id} pet={pet} index={index} showAction={false} />)}</div> : <div className="empty-state"><span className="empty-paw"><ClipboardList size={26} /></span><h3>{empty}</h3><p>Quando houver novidades, elas aparecem aqui.</p><button className="button button-dark" onClick={onAction}><Plus size={16} /> {emptyAction}</button></div>}</section>
}

function AdoptionsView({ role, onNotice }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const endpoint = role === 'donor' ? '/adoptions/incoming' : '/adoptions/mine'
  useEffect(() => { api.get(endpoint).then(({ data }) => setItems(data)).catch(() => setItems([])).finally(() => setLoading(false)) }, [endpoint])
  async function decide(id, decision) {
    try {
      const { data } = await api.patch(`/adoptions/${id}/decision`, { decision })
      setItems((current) => current.map((item) => item.id === id ? data : item))
      onNotice(decision === 'approved' ? 'Adoção aprovada. Um novo lar está começando!' : 'Solicitação recusada.')
    } catch (error) { onNotice(error.response?.data?.detail || 'Não foi possível responder à solicitação.') }
  }
  return <section className="collection-section"><div className="collection-heading"><span className="eyebrow eyebrow-muted">Acompanhamento</span><h1>{role === 'donor' ? 'Solicitações recebidas' : 'Meus pedidos'}<span className="brand-period">.</span></h1></div>{loading ? <div className="loading-state"><LoaderCircle className="spin" size={24} /> Carregando...</div> : items.length ? <div className="adoption-list">{items.map((item) => <article className="adoption-row" key={item.id}><img src={item.pet.image_url} alt={item.pet.name} /><div className="adoption-content"><span className={`status-pill status-${item.status}`}>{item.status === 'pending' ? 'Em análise' : item.status === 'approved' ? 'Aprovada' : 'Recusada'}</span><h3>{item.pet.name} <span>· {role === 'donor' ? item.adopter.name : item.pet.donor_name}</span></h3><p>{item.message}</p><small><MapPin size={13} /> {item.pet.city}</small></div>{role === 'donor' && item.status === 'pending' && <div className="decision-actions"><button className="button button-dark button-small" onClick={() => decide(item.id, 'approved')}><Check size={15} /> Aprovar</button><button className="text-button" onClick={() => decide(item.id, 'rejected')}>Recusar</button></div>}</article>)}</div> : <div className="empty-state"><span className="empty-paw"><Heart size={26} /></span><h3>Nenhuma solicitação por enquanto</h3><p>{role === 'donor' ? 'Quando alguém se interessar pelos seus pets, você verá a mensagem por aqui.' : 'Quando você demonstrar interesse por um pet, poderá acompanhar o pedido por aqui.'}</p></div>}</section>
}

export default App
