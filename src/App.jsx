import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';

const getEnv = (key) => {
    try { return import.meta.env[key]; } catch(e) { return ''; }
};

// As 5 URLs cruciais
const URL_LEADS = getEnv('VITE_LEADS_URL');
const URL_EMENDAS = getEnv('VITE_EMENDAS_URL');
const URL_AGENDA = getEnv('VITE_AGENDA_URL');
const URL_DADOS_GERAIS = getEnv('VITE_DADOS_GERAIS_URL'); 
const URL_CONTATOS = getEnv('VITE_CONTATOS_URL'); 

const formatCurrency = (num) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num || 0);

const parseCurrency = (val) => {
    if(!val) return 0;
    if(typeof val === 'number') return val;
    const str = String(val).replace(/[R$\s\.]/g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

// Parse rigoroso de números para votos
const parseVotos = (val) => {
    if (!val && val !== 0) return 0;
    if (typeof val === 'number') return val;
    let str = String(val).trim();
    if (str === '-' || str === '') return 0;
    str = str.replace(/[R$\s]/g, '');
    if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    else if (/\.\d{3}$/.test(str) || str.split('.').length > 2) str = str.replace(/\./g, '');
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
};

const normalizeStr = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const isFloripa = (str) => {
    if (!str) return false;
    const s = normalizeStr(str);
    return s.includes('florianopolis') || s.includes('floripa');
};

// Detector de dados vazios/inválidos para ignorar nos gráficos
const isInvalidData = (str) => {
    if (!str) return true;
    const s = normalizeStr(str);
    return s === '' || s === '-' || s.includes('outros') || s.includes('nao informado') || s.includes('nao definido') || s.includes('tema nao definido');
};

// Inteligência de Temas
const getTemaFromOrigem = (origem) => {
    if (!origem) return "Tema Não Definido";
    const o = String(origem).toLowerCase();
    if (/abelha/.test(o)) return "Abelhas sem ferrão";
    if (/agricultura urbana|horta/.test(o)) return "Agricultura urbana";
    if (/agroecologia|orgânico/.test(o)) return "Agroecologia";
    if (/cultura|música|arte/.test(o)) return "Cultura";
    if (/educação|escola/.test(o)) return "Educação";
    if (/climática|ambienta/.test(o)) return "Meio Ambiente";
    if (/mobilidade/.test(o)) return "Mobilidade Urbana";
    if (/saneamento/.test(o)) return "Cidade e Saneamento";
    if (/saúde/.test(o)) return "Saúde";
    if (/alimentos|cozinha/.test(o)) return "Segurança Alimentar";
    return "Outros";
};

const Icons = {
    Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    FileText: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
    Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Filter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    Building: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22"></line><line x1="15" y1="22" x2="15" y2="22"></line><line x1="9" y1="6" x2="9.01" y2="6"></line><line x1="15" y1="6" x2="15.01" y2="6"></line><line x1="9" y1="10" x2="9.01" y2="10"></line><line x1="15" y1="10" x2="15.01" y2="10"></line><line x1="9" y1="14" x2="9.01" y2="14"></line><line x1="15" y1="14" x2="15.01" y2="14"></line></svg>,
    Briefcase: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    List: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
};

const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [data, setData] = useState({ leads: [], emendas: [], agenda: [], estado: [], capital: [], contatos: [] });
    const [loadingInfo, setLoadingInfo] = useState({ isLoading: true, stage: 'Iniciando...', progress: 0 });
    const [isMock, setIsMock] = useState(false);
    
    // Controles de Navegação e Filtro
    const [selectedEntity, setSelectedEntity] = useState(null); 
    const [territoryScope, setTerritoryScope] = useState('ALL'); // 'ALL' | 'CAPITAL' | 'INTERIOR'
    const [includeFloripa, setIncludeFloripa] = useState(false); // Chave para incluir Floripa no Estado
    const [globalFilters, setGlobalFilters] = useState({ temas: [], regioes: [] });
    const [mainView, setMainView] = useState('dashboard'); // 'dashboard', 'lista_sc', 'lista_floripa'

    useEffect(() => {
        const loadData = async () => {
            setLoadingInfo({ isLoading: true, stage: 'Conectando aos servidores...', progress: 10 });
            try {
                const fetchJSON = async (url) => {
                    if(!url) return null;
                    const res = await fetch(url);
                    if(!res.ok) return null;
                    return await res.json();
                };

                setLoadingInfo({ isLoading: true, stage: 'Baixando Central de Leads (1/5)...', progress: 20 });
                let leadsRaw = await fetchJSON(URL_LEADS) || [];
                
                setLoadingInfo({ isLoading: true, stage: 'Processando Emendas (2/5)...', progress: 40 });
                let emendasRaw = await fetchJSON(URL_EMENDAS) || [];

                setLoadingInfo({ isLoading: true, stage: 'Sincronizando Agenda (3/5)...', progress: 60 });
                let agendaRaw = await fetchJSON(URL_AGENDA) || [];

                setLoadingInfo({ isLoading: true, stage: 'Baixando Lideranças CRM (4/5)...', progress: 80 });
                let contatosRaw = await fetchJSON(URL_CONTATOS) || [];

                setLoadingInfo({ isLoading: true, stage: 'Cruzando Dados Eleitorais (5/5)...', progress: 95 });
                let dadosGerais = await fetchJSON(URL_DADOS_GERAIS) || { estado: [], capital: [] };

                // Mock Fallback para prévia no chat
                if (leadsRaw.length === 0 && emendasRaw.length === 0 && dadosGerais.estado.length === 0) {
                    setIsMock(true);
                    leadsRaw = [
                        { nome: "João Silva", cidade: "Florianópolis", bairroReplan: "Campeche", origem: "Assinatura Horta Comunitária" },
                        { nome: "Maria Souza", cidade: "Lages", origem: "Seminário Agroecologia" },
                        { nome: "Carlos Mendes", cidade: "Florianópolis", bairroReplan: "Trindade", origem: "Fórum Mobilidade" }
                    ];
                    emendasRaw = [
                        { "NÚMERO DA EMENDA": "202401", "MUNICÍPIO": "Florianópolis", "OBJETO": "Equipamentos Horta", "TOTAL": "150000", "TEMA": "Agricultura urbana", "ARTICULADOR": "Ana", "REGIÃO": "Grande Florianópolis" },
                        { "NÚMERO DA EMENDA": "202402", "MUNICÍPIO": "Lages", "OBJETO": "Feira Orgânica", "TOTAL": "80000", "TEMA": "Agroecologia", "ARTICULADOR": "Beto", "REGIÃO": "Serra" }
                    ];
                    agendaRaw = [
                        { "Título": "Reunião Comunitária", "Município": "Florianópolis", "Bairro": "Campeche", "Início": new Date().toISOString(), "Articulador": "Ana", "Classe de Atividade": "Comunidade" },
                        { "Título": "Visita Técnica", "Município": "Lages", "Início": new Date().toISOString(), "Articulador": "Beto", "Classe de Atividade": "Fiscalização" }
                    ];
                    contatosRaw = [
                        { lideranca: "Assoc. Moradores Campeche", base: "Base Florianópolis", municipio_bairro: "Campeche", regiao: "Sul da Ilha", distrito: "Campeche", situacao: "4 - Comprometido", temas: "Meio Ambiente", articulador: "Ana" },
                        { lideranca: "Sindicato Trabalhadores", base: "Base Santa Catarina", municipio_bairro: "Lages", regiao: "Serra", situacao: "3 - Simpatizante", temas: "Trabalho", articulador: "Beto" }
                    ];
                    dadosGerais = {
                        estado: [
                            { Cidade: "Lages", "Votos 2018": "800", "Votos 2022": "1500", "Região do Estado": "Serra" },
                            { Cidade: "Joinville", "Votos 2018": "1200", "Votos 2022": "3200", "Região do Estado": "Norte" },
                            { Cidade: "Florianópolis", "Votos 2018": "15000", "Votos 2022": "25000", "Região do Estado": "Grande Florianópolis" }
                        ],
                        capital: [
                            { Bairro: "Campeche", Distrito: "Campeche", Região: "Sul da Ilha", "Votos 2022": "1800", "Votos 2024": "2100" },
                            { Bairro: "Trindade", Distrito: "Sede", Região: "Centro", "Votos 2022": "1650", "Votos 2024": "1900" }
                        ]
                    };
                }

                // Processamento
                const leads = leadsRaw.map((l, i) => ({
                    id: `l_${i}`,
                    nome: l['NOME'] || l['nome'] || 'Anônimo',
                    municipio: (l['CIDADE'] || l['cidade'] || '').trim(),
                    bairro: (l['BAIRRO REVISADO + REPLAN'] || l['bairroReplan'] || l['bairro'] || '').trim(),
                    tema: getTemaFromOrigem(l['ORIGEM'] || l['origem'])
                })).filter(l => l.municipio);

                const emendas = emendasRaw.map((e, i) => ({
                    id: `e_${i}`,
                    numero: e['NÚMERO DA EMENDA'] || e['numero'] || '',
                    municipio: (e['MUNICÍPIO'] || e['municipio'] || '').trim(),
                    objeto: e['OBJETO'] || e['objeto'] || '',
                    total: parseCurrency(e['TOTAL'] || e['total']),
                    tema: e['TEMA'] || e['tema'] || '',
                    articulador: (e['ARTICULADOR'] || e['articulador'] || '').trim(),
                    regiao: e['REGIÃO'] || e['regiao'] || ''
                })).filter(e => e.numero);

                const agenda = agendaRaw.map((a, i) => ({
                    id: `a_${i}`,
                    titulo: a['Título'] || a['titulo'] || '',
                    municipio: (a['Município'] || a['municipio'] || '').trim(),
                    bairro: (a['Bairro'] || a['bairro'] || '').trim(),
                    articulador: (a['Articulador'] || a['articulador'] || '').trim(),
                    classe: a['Classe de Atividade'] || ''
                }));

                const contatos = contatosRaw.map((c, i) => ({
                    id: `c_${i}`,
                    nome: c['lideranca'] || c['LIDERANÇA'] || '',
                    base: c['base'] || '',
                    municipio_bairro: (c['municipio_bairro'] || c['MUNICÍPIO'] || c['Bairro REPLAN'] || '').trim(),
                    regiao: (c['regiao'] || c['REGIÃO'] || '').trim(),
                    distrito: (c['distrito'] || c['DISTRITO'] || '').trim(),
                    situacao: c['situacao'] || c['SITUAÇÃO'] || '',
                    tema: c['temas'] || c['TEMAS'] || '',
                    articulador: c['articulador'] || c['ARTICULADOR'] || ''
                })).filter(c => c.nome);

                setData({ leads, emendas, agenda, contatos, estado: dadosGerais.estado || [], capital: dadosGerais.capital || [] });

            } catch (err) {
                console.error(err);
            } finally {
                setLoadingInfo({ isLoading: false, stage: 'Concluído', progress: 100 });
            }
        };

        loadData();
    }, []);

    return (
        <AppContext.Provider value={{ ...data, loadingInfo, isMock, selectedEntity, setSelectedEntity, globalFilters, setGlobalFilters, territoryScope, setTerritoryScope, includeFloripa, setIncludeFloripa, mainView, setMainView }}>
            {children}
        </AppContext.Provider>
    );
};

const NativeBarChart = ({ data, colorClass, valueFormatter = (v) => v, maxItems = 5, invalidLabel = 'Não Definidos', invalidValue = 0 }) => {
    const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);
    const maxVal = sorted.length > 0 ? sorted[0].value : 1;

    if (sorted.length === 0) return <div className="p-4 text-gray-500 font-bold text-sm uppercase">Sem dados cruzados para este filtro.</div>;

    return (
        <div className="space-y-4 mt-4 flex flex-col h-full">
            <div className="flex-1 space-y-4">
                {sorted.map((item, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between text-xs font-black uppercase mb-1 tracking-wider">
                            <span className="truncate pr-4">{item.name || 'Não Informado'}</span>
                            <span>{valueFormatter(item.value)}</span>
                        </div>
                        <div className="h-4 w-full bg-white border-2 border-black overflow-hidden relative">
                            <div 
                                className={`h-full border-r-2 border-black transition-all duration-1000 ${colorClass}`} 
                                style={{ width: `${Math.max((item.value / maxVal) * 100, 2)}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
            {invalidValue > 0 && (
                <div className="mt-4 pt-2 border-t-2 border-dashed border-gray-300 text-right">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">{invalidLabel}: {valueFormatter(invalidValue)}</span>
                </div>
            )}
        </div>
    );
};

const useSortableData = (items, config = null) => {
    const [sortConfig, setSortConfig] = useState(config);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (typeof aValue === 'string') {
                    return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc'; 
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    return { items: sortedItems, requestSort, sortConfig };
};

const ThSortable = ({ label, sortKey, currentSort, onSort, widthClass="" }) => {
    const isActive = currentSort?.key === sortKey;
    return (
        <th onClick={() => onSort(sortKey)} className={`px-4 py-3 font-black border-r-2 border-black cursor-pointer hover:bg-gray-800 hover:text-white transition-colors select-none ${widthClass}`}>
            <div className="flex items-center justify-between">
                <span>{label}</span>
                <span className={`text-gray-400 ${isActive ? 'text-yellow-400' : 'opacity-50'}`}>
                    {isActive ? (currentSort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
            </div>
        </th>
    );
};

const Sidebar = () => {
    const { emendas, leads, contatos, selectedEntity, setSelectedEntity, globalFilters, setGlobalFilters, territoryScope, setTerritoryScope, includeFloripa, setIncludeFloripa, setMainView } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    
    const searchIndex = useMemo(() => {
        const index = [];
        const add = (type, name, label) => {
            if (name && !isInvalidData(name) && !index.some(i => i.name === name && i.type === type)) {
                index.push({ type, name, label: label || name });
            }
        };
        emendas.forEach(e => {
            add('municipio', e.municipio, `Município: ${e.municipio}`);
            add('articulador', e.articulador, `Articulador: ${e.articulador}`);
            add('regiao', e.regiao, `Região: ${e.regiao}`);
        });
        leads.forEach(l => {
            if (isFloripa(l.municipio) && l.bairro) add('bairro', l.bairro, `Bairro (Capital): ${l.bairro}`);
        });
        contatos.forEach(c => {
            add('articulador', c.articulador, `Articulador: ${c.articulador}`);
            add('regiao', c.regiao, `Região: ${c.regiao}`);
            if (c.base.includes('Florianópolis')) add('distrito', c.distrito, `Distrito: ${c.distrito}`);
            else add('municipio', c.municipio_bairro, `Município: ${c.municipio_bairro}`);
        });
        return index;
    }, [emendas, leads, contatos]);

    const searchResults = useMemo(() => {
        if (searchTerm.length < 2) return [];
        const term = searchTerm.toLowerCase();
        return searchIndex.filter(i => i.label.toLowerCase().includes(term)).slice(0, 10);
    }, [searchTerm, searchIndex]);

    const regioes = useMemo(() => [...new Set([...emendas.map(e => e.regiao), ...contatos.map(c => c.regiao)].filter(r => !isInvalidData(r)))].sort(), [emendas, contatos]);
    const temas = useMemo(() => [...new Set([...emendas.map(e => e.tema), ...contatos.map(c => c.tema)].filter(t => !isInvalidData(t)))].sort(), [emendas, contatos]);

    return (
        <div className="w-full md:w-80 bg-[#FDFBF7] border-r-4 border-black flex flex-col z-20 flex-shrink-0 h-auto md:h-full">
            <div className="p-6 border-b-4 border-black bg-[#EAA221] cursor-pointer" onClick={() => {setSelectedEntity(null); setMainView('dashboard');}}>
                <h1 className="text-3xl font-black text-black tracking-tighter uppercase">TABULUM</h1>
                <p className="text-[10px] font-black tracking-widest uppercase mt-1">Inteligência Estratégica</p>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
                <div className="p-4 border-b-4 border-black bg-white">
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 text-[#C1272D] flex items-center">
                        <Icons.MapPin /> <span className="ml-1">Foco Territorial</span>
                    </label>
                    <div className="flex flex-col gap-2 border-2 border-black p-1 bg-gray-100">
                        <button onClick={() => setTerritoryScope('ALL')} className={`p-2 text-xs font-black uppercase border-2 transition-colors ${territoryScope === 'ALL' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                            Visão Geral (Estado)
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => setTerritoryScope('CAPITAL')} className={`flex-1 p-2 text-[10px] font-black uppercase border-2 transition-colors ${territoryScope === 'CAPITAL' ? 'bg-[#007D8A] text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                                Capital (Floripa)
                            </button>
                            <button onClick={() => setTerritoryScope('INTERIOR')} className={`flex-1 p-2 text-[10px] font-black uppercase border-2 transition-colors ${territoryScope === 'INTERIOR' ? 'bg-[#C1272D] text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                                Interior (SC)
                            </button>
                        </div>
                    </div>
                    {territoryScope !== 'CAPITAL' && (
                        <label className="flex items-center space-x-2 mt-3 cursor-pointer group">
                            <input type="checkbox" checked={includeFloripa} onChange={e => setIncludeFloripa(e.target.checked)} className="w-4 h-4 accent-black border-2 border-black" />
                            <span className="text-[10px] font-bold uppercase text-gray-600 group-hover:text-black">Incluir Floripa no Estado</span>
                        </label>
                    )}
                </div>

                <div className="p-4 space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Busca Universal</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                <Icons.Search />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Local, articulador, tema..." 
                                className="block w-full pl-10 pr-3 py-3 border-4 border-black bg-white font-bold text-sm focus:outline-none focus:border-[#C1272D] transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchResults.length > 0 && (
                                <ul className="absolute z-50 w-full mt-2 bg-white border-4 border-black max-h-60 overflow-auto shadow-[4px_4px_0_0_rgba(17,17,17,1)]">
                                    {searchResults.map((res, idx) => (
                                        <li 
                                            key={idx} 
                                            className="px-4 py-3 hover:bg-[#EAA221] cursor-pointer text-xs font-bold uppercase border-b-2 border-black last:border-0"
                                            onClick={() => { setSelectedEntity({type: res.type, name: res.name}); setSearchTerm(''); }}
                                        >
                                            {res.label}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center text-[10px] font-black uppercase tracking-widest mb-3 border-b-2 border-black pb-2">
                            <Icons.Filter /> <span className="ml-2">Filtros Cruzados</span>
                        </div>
                        
                        <div className="space-y-4">
                            {territoryScope !== 'CAPITAL' && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Regiões do Estado</label>
                                    <div className="max-h-32 overflow-y-auto border-2 border-black bg-white p-2 space-y-1 custom-scrollbar">
                                        {regioes.map(r => (
                                            <label key={r} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-gray-100 group">
                                                <input type="checkbox" checked={globalFilters.regioes.includes(r)} onChange={() => setGlobalFilters(prev => ({ ...prev, regioes: prev.regioes.includes(r) ? prev.regioes.filter(v => v !== r) : [...prev.regioes, r] }))} className="w-4 h-4 accent-black border-2 border-black" />
                                                <span className="text-[10px] font-bold uppercase truncate group-hover:text-[#007D8A]">{r}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Temas de Atuação</label>
                                <div className="max-h-40 overflow-y-auto border-2 border-black bg-white p-2 space-y-1 custom-scrollbar">
                                    {temas.map(t => (
                                        <label key={t} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-gray-100 group">
                                            <input type="checkbox" checked={globalFilters.temas.includes(t)} onChange={() => setGlobalFilters(prev => ({ ...prev, temas: prev.temas.includes(t) ? prev.temas.filter(v => v !== t) : [...prev.temas, t] }))} className="w-4 h-4 accent-black border-2 border-black" />
                                            <span className="text-[10px] font-bold uppercase truncate group-hover:text-[#EAA221]">{t}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { leads, emendas, agenda, contatos, estado, capital, globalFilters, territoryScope, includeFloripa, isMock } = useContext(AppContext);

    // Filtros unificados
    const filterByTerritory = (mun) => {
        const isF = isFloripa(mun);
        if (territoryScope === 'CAPITAL') return isF;
        if (territoryScope === 'INTERIOR') return !isF;
        // ALL
        if (isF && !includeFloripa) return false;
        return true;
    };

    const filteredEmendas = useMemo(() => emendas.filter(e => filterByTerritory(e.municipio) && (globalFilters.regioes.length === 0 || globalFilters.regioes.includes(e.regiao)) && (globalFilters.temas.length === 0 || globalFilters.temas.includes(e.tema))), [emendas, globalFilters, territoryScope, includeFloripa]);
    const filteredLeads = useMemo(() => leads.filter(l => filterByTerritory(l.municipio) && (globalFilters.temas.length === 0 || !l.tema || globalFilters.temas.includes(l.tema))), [leads, globalFilters, territoryScope, includeFloripa]);
    const filteredAgenda = useMemo(() => agenda.filter(a => filterByTerritory(a.municipio)), [agenda, territoryScope, includeFloripa]);
    const filteredContatos = useMemo(() => contatos.filter(c => {
        const isF = c.base.includes('Florianópolis');
        if (territoryScope === 'CAPITAL' && !isF) return false;
        if (territoryScope === 'INTERIOR' && isF) return false;
        if (territoryScope === 'ALL' && isF && !includeFloripa) return false;
        if (globalFilters.regioes.length > 0 && !globalFilters.regioes.includes(c.regiao)) return false;
        if (globalFilters.temas.length > 0 && !globalFilters.temas.includes(c.tema)) return false;
        return true;
    }), [contatos, globalFilters, territoryScope, includeFloripa]);

    // Estatísticas Globais (Votos Evolução)
    const statsVotos = useMemo(() => {
        let v18SC = 0, v22SC = 0, v22Cap = 0, v24Cap = 0;
        
        if (territoryScope !== 'CAPITAL') {
            estado.forEach(e => {
                if (isFloripa(e.Cidade) && !includeFloripa) return;
                v18SC += parseVotos(e['Votos 2018']);
                v22SC += parseVotos(e['Votos 2022']);
            });
        }
        
        if (territoryScope === 'CAPITAL' || (territoryScope === 'ALL' && includeFloripa)) {
            capital.forEach(c => {
                v22Cap += parseVotos(c['Votos 2022']);
                v24Cap += parseVotos(c['Votos 2024']);
            });
        }

        return { v18SC, v22SC, v22Cap, v24Cap, 
                 totalAtual: (territoryScope === 'CAPITAL' ? v24Cap : (territoryScope === 'INTERIOR' ? v22SC : v22SC + v22Cap)) };
    }, [estado, capital, territoryScope, includeFloripa]);

    const stats = {
        leads: filteredLeads.length,
        contatos: filteredContatos.length,
        emendasCount: filteredEmendas.length,
        emendasValor: filteredEmendas.reduce((acc, curr) => acc + curr.total, 0),
        agendas: filteredAgenda.length
    };

    // Cruzamentos com filtro de inválidos
    const crossChartTemasLeads = useMemo(() => {
        const map = {}; let invalid = 0;
        [...filteredLeads, ...filteredContatos].forEach(item => { 
            const t = item.tema;
            if (isInvalidData(t)) invalid++; else map[t] = (map[t] || 0) + 1; 
        });
        return { data: Object.entries(map).map(([name, value]) => ({ name, value })), invalid };
    }, [filteredLeads, filteredContatos]);

    const crossChartTemasEmendas = useMemo(() => {
        const map = {}; let invalid = 0;
        filteredEmendas.forEach(e => { 
            const t = e.tema;
            if (isInvalidData(t)) invalid += e.total; else map[t] = (map[t] || 0) + e.total; 
        });
        return { data: Object.entries(map).map(([name, value]) => ({ name, value })), invalid };
    }, [filteredEmendas]);

    const crossChartArticuladores = useMemo(() => {
        const map = {}; let invalid = 0;
        [...filteredAgenda, ...filteredEmendas, ...filteredContatos].forEach(item => {
            const a = item.articulador;
            if (isInvalidData(a)) {
                invalid++;
            } else {
                if(!map[a]) map[a] = 0;
                map[a] += 1;
            }
        });
        return { data: Object.entries(map).map(([name, value]) => ({ name, value })), invalid };
    }, [filteredAgenda, filteredEmendas, filteredContatos]);

    const crossChartLocais = useMemo(() => {
        const map = {}; let invalid = 0;
        [...filteredLeads, ...filteredContatos].forEach(item => {
            const loc = territoryScope === 'CAPITAL' ? item.bairro || item.municipio_bairro : item.municipio || item.municipio_bairro;
            if (isInvalidData(loc)) invalid++; else map[loc] = (map[loc] || 0) + 1;
        });
        return { data: Object.entries(map).map(([name, value]) => ({ name, value })), invalid };
    }, [filteredLeads, filteredContatos, territoryScope]);

    return (
        <div className="space-y-8 w-full max-w-6xl mx-auto pb-12 animate-fade-in">
            {isMock && (
                <div className="bg-black text-white p-4 font-black uppercase text-xs flex items-center border-4 border-[#EAA221] shadow-[4px_4px_0_0_#EAA221]">
                    ⚠️ Demonstração visual (Variáveis não detectadas). Configure as URLs no Vercel para ver dados reais.
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {territoryScope !== 'CAPITAL' && (
                    <div className="bg-[#EAA221] text-black border-4 border-black p-6 shadow-[6px_6px_0px_0px_#111111] flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/70 mb-4 block">Evolução de Votos (SC)</span>
                        <div className="flex items-end gap-6">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold opacity-80">2018</span>
                                <span className="text-3xl font-black">{statsVotos.v18SC.toLocaleString()}</span>
                            </div>
                            <div className="text-xl font-black opacity-50 mb-1">&rarr;</div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black bg-black text-[#EAA221] px-1 w-fit">2022</span>
                                <span className="text-5xl font-black">{statsVotos.v22SC.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
                {(territoryScope === 'CAPITAL' || (territoryScope === 'ALL' && includeFloripa)) && (
                    <div className="bg-[#007D8A] text-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#111111] flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-4 block">Evolução de Votos (Capital)</span>
                        <div className="flex items-end gap-6">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold opacity-80">2022</span>
                                <span className="text-3xl font-black">{statsVotos.v22Cap.toLocaleString()}</span>
                            </div>
                            <div className="text-xl font-black opacity-50 mb-1">&rarr;</div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black bg-white text-[#007D8A] px-1 w-fit">2024</span>
                                <span className="text-5xl font-black">{statsVotos.v24Cap.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Briefcase /><span className="ml-2">Lideranças (CRM)</span></h3>
                    <div className="text-4xl font-black text-[#C1272D]">{stats.contatos}</div>
                    <div className="h-2 w-full bg-black mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Users /><span className="ml-2">Leads (Eventos)</span></h3>
                    <div className="text-4xl font-black">{stats.leads}</div>
                    <div className="h-2 w-full bg-[#007D8A] mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.FileText /><span className="ml-2">Emendas</span></h3>
                    <div className="text-xl sm:text-2xl font-black truncate">{formatCurrency(stats.emendasValor)}</div>
                    <div className="text-[10px] font-bold mt-1 text-gray-400 uppercase">{stats.emendasCount} Ocorrências</div>
                    <div className="h-2 w-full bg-[#EAA221] mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Calendar /><span className="ml-2">Agendas Realizadas</span></h3>
                    <div className="text-4xl font-black">{stats.agendas}</div>
                    <div className="h-2 w-full bg-[#C1272D] mt-2 border border-black"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col">
                    <h3 className="text-lg font-black uppercase border-b-4 border-black pb-2 mb-4">Engajamento vs Investimento (Temas)</h3>
                    <div className="flex-1 space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Por Volume de Lideranças + Leads</p>
                            <NativeBarChart data={crossChartTemasLeads.data} colorClass="bg-black" maxItems={3} invalidValue={crossChartTemasLeads.invalid} invalidLabel="S/ Tema Definido" />
                        </div>
                        <div className="border-t-2 border-dashed border-gray-300 pt-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Por R$ Destinado (Emendas)</p>
                            <NativeBarChart data={crossChartTemasEmendas.data} colorClass="bg-[#EAA221]" valueFormatter={formatCurrency} maxItems={3} invalidValue={crossChartTemasEmendas.invalid} invalidLabel="S/ Tema Definido" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col h-full">
                        <h3 className="text-lg font-black uppercase border-b-4 border-black pb-2 mb-2">Performance Articuladores</h3>
                        <p className="text-[10px] font-bold text-gray-400 mb-4 uppercase">Volume Agendas + Emendas + Lideranças</p>
                        <NativeBarChart data={crossChartArticuladores.data} colorClass="bg-[#C1272D]" maxItems={4} invalidValue={crossChartArticuladores.invalid} invalidLabel="S/ Articulador Mapeado" />
                    </div>

                    <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col h-full">
                        <h3 className="text-lg font-black uppercase border-b-4 border-black pb-2 mb-2">
                            Top Locais (Lideranças + Leads)
                        </h3>
                        <NativeBarChart data={crossChartLocais.data} colorClass="bg-[#007D8A]" maxItems={4} invalidValue={crossChartLocais.invalid} invalidLabel="Local Não Informado" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ListaMunicipios = () => {
    const { estado, emendas, contatos, leads, setSelectedEntity, includeFloripa } = useContext(AppContext);

    const dadosAgregados = useMemo(() => {
        const munisSet = new Set([...estado.map(e=>e.Cidade), ...emendas.map(e=>e.municipio), ...contatos.filter(c=>c.base.includes('Santa Catarina')).map(c=>c.municipio_bairro)].filter(m => !isInvalidData(m)));
        
        return Array.from(munisSet).map(mun => {
            if (isFloripa(mun) && !includeFloripa) return null;
            const rowEstado = estado.find(e => normalizeStr(e.Cidade) === normalizeStr(mun)) || {};
            const votos18 = parseVotos(rowEstado['Votos 2018']);
            const votos22 = parseVotos(rowEstado['Votos 2022']);
            const regiao = rowEstado['Região do Estado'] || '-';
            
            const volEmendas = emendas.filter(e => normalizeStr(e.municipio) === normalizeStr(mun)).reduce((acc, curr) => acc + curr.total, 0);
            const numContatos = contatos.filter(c => c.base.includes('Santa Catarina') && normalizeStr(c.municipio_bairro) === normalizeStr(mun)).length;
            const numLeads = leads.filter(l => normalizeStr(l.municipio) === normalizeStr(mun)).length;

            return { municipio: mun, regiao, votos18, votos22, volEmendas, numContatos, numLeads };
        }).filter(Boolean);
    }, [estado, emendas, contatos, leads, includeFloripa]);

    const { items, requestSort, sortConfig } = useSortableData(dadosAgregados, { key: 'votos22', direction: 'desc' });

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#111111] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-[#111111] text-white border-b-4 border-black text-xs uppercase">
                        <tr>
                            <ThSortable label="Município" sortKey="municipio" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/4" />
                            <ThSortable label="Região" sortKey="regiao" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos '18" sortKey="votos18" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos '22" sortKey="votos22" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Lideranças" sortKey="numContatos" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Leads" sortKey="numLeads" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Emendas (R$)" sortKey="volEmendas" currentSort={sortConfig} onSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((m, i) => (
                            <tr key={i} className="border-b-2 border-gray-200 hover:bg-[#EAA221]/20 cursor-pointer transition-colors"
                                onClick={() => setSelectedEntity({ type: 'municipio', name: m.municipio })}>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-sm uppercase">{m.municipio}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase">{m.regiao}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-bold text-gray-400 text-right">{m.votos18.toLocaleString()}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-[#C1272D] text-right">{m.votos22.toLocaleString()}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-center">{m.numContatos}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-bold text-gray-500 text-center">{m.numLeads}</td>
                                <td className="px-4 py-3 font-black text-[#007D8A] text-right">{formatCurrency(m.volEmendas)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ListaCapital = () => {
    const { capital, contatos, leads, setSelectedEntity } = useContext(AppContext);

    const dadosAgregados = useMemo(() => {
        const bairrosMap = {};

        capital.forEach(c => {
            const b = normalizeStr(c.Bairro);
            if (isInvalidData(b)) return;
            if (!bairrosMap[b]) bairrosMap[b] = { bairro: c.Bairro, distrito: c.Distrito || '-', regiao: c.Região || '-', votos22: 0, votos24: 0, numContatos: 0, numLeads: 0 };
            bairrosMap[b].votos22 += parseVotos(c['Votos 2022']);
            bairrosMap[b].votos24 += parseVotos(c['Votos 2024']);
        });

        contatos.filter(c => c.base.includes('Florianópolis')).forEach(c => {
            const b = normalizeStr(c.municipio_bairro);
            if (isInvalidData(b)) return;
            if (!bairrosMap[b]) bairrosMap[b] = { bairro: c.municipio_bairro, distrito: c.distrito || '-', regiao: c.regiao || '-', votos22: 0, votos24: 0, numContatos: 0, numLeads: 0 };
            bairrosMap[b].numContatos += 1;
        });

        leads.filter(l => isFloripa(l.municipio)).forEach(l => {
            const b = normalizeStr(l.bairro);
            if (isInvalidData(b)) return;
            if (bairrosMap[b]) bairrosMap[b].numLeads += 1;
        });

        return Object.values(bairrosMap);
    }, [capital, contatos, leads]);

    const { items, requestSort, sortConfig } = useSortableData(dadosAgregados, { key: 'votos24', direction: 'desc' });

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#111111] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-[#111111] text-white border-b-4 border-black text-xs uppercase">
                        <tr>
                            <ThSortable label="Bairro" sortKey="bairro" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/4" />
                            <ThSortable label="Distrito" sortKey="distrito" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Região" sortKey="regiao" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos '22" sortKey="votos22" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos '24" sortKey="votos24" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Lideranças" sortKey="numContatos" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Leads" sortKey="numLeads" currentSort={sortConfig} onSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((b, i) => (
                            <tr key={i} className="border-b-2 border-gray-200 hover:bg-[#007D8A]/20 cursor-pointer transition-colors"
                                onClick={() => setSelectedEntity({ type: 'bairro', name: b.bairro })}>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-sm uppercase">{b.bairro}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase">{b.distrito}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase">{b.regiao}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-bold text-gray-400 text-right">{b.votos22.toLocaleString()}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-[#007D8A] text-right">{b.votos24.toLocaleString()}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-center">{b.numContatos}</td>
                                <td className="px-4 py-3 font-bold text-gray-500 text-center">{b.numLeads}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const FichaCompleta = () => {
    const { selectedEntity, setSelectedEntity, leads, contatos, emendas, agenda, estado, capital } = useContext(AppContext);
    
    const entityData = useMemo(() => {
        const { type, name } = selectedEntity;
        const n = normalizeStr(name);
        
        let relLeads = [], relContatos = [], relEmendas = [], relAgendas = [], relVotos = null;

        const matchStr = (val) => normalizeStr(val) === n;

        if (type === 'municipio') {
            relLeads = leads.filter(l => matchStr(l.municipio));
            relContatos = contatos.filter(c => c.base.includes('Santa Catarina') && matchStr(c.municipio_bairro));
            relEmendas = emendas.filter(e => matchStr(e.municipio));
            relAgendas = agenda.filter(a => matchStr(a.municipio));
            
            const v = estado.find(r => matchStr(r['Cidade']));
            if (v) relVotos = { type: 'Estado (SC)', vAntigo: parseVotos(v['Votos 2018']), vNovo: parseVotos(v['Votos 2022']), labelA: '2018', labelN: '2022', regiao: v['Região do Estado'] };
        } 
        else if (type === 'bairro') {
            relLeads = leads.filter(l => isFloripa(l.municipio) && matchStr(l.bairro));
            relContatos = contatos.filter(c => c.base.includes('Florianópolis') && matchStr(c.municipio_bairro));
            relAgendas = agenda.filter(a => isFloripa(a.municipio) && matchStr(a.bairro));
            
            const vArr = capital.filter(r => matchStr(r['Bairro']));
            if (vArr.length > 0) {
                const tot22 = vArr.reduce((acc, curr) => acc + parseVotos(curr['Votos 2022']), 0);
                const tot24 = vArr.reduce((acc, curr) => acc + parseVotos(curr['Votos 2024']), 0);
                relVotos = { type: 'Capital (Bairro)', vAntigo: tot22, vNovo: tot24, labelA: '2022', labelN: '2024', regiao: vArr[0]['Região'] };
            }
        }
        else if (type === 'regiao') {
            relContatos = contatos.filter(c => matchStr(c.regiao));
            relEmendas = emendas.filter(e => matchStr(e.regiao));
        }
        else if (type === 'distrito') {
            relContatos = contatos.filter(c => matchStr(c.distrito));
            const vArr = capital.filter(r => matchStr(r['Distrito']));
            if (vArr.length > 0) {
                const tot22 = vArr.reduce((acc, curr) => acc + parseVotos(curr['Votos 2022']), 0);
                const tot24 = vArr.reduce((acc, curr) => acc + parseVotos(curr['Votos 2024']), 0);
                relVotos = { type: 'Capital (Distrito)', vAntigo: tot22, vNovo: tot24, labelA: '2022', labelN: '2024', regiao: vArr[0]['Região'] };
            }
        }
        else if (type === 'articulador') {
            relContatos = contatos.filter(c => matchStr(c.articulador));
            relEmendas = emendas.filter(e => matchStr(e.articulador));
            relAgendas = agenda.filter(a => matchStr(a.articulador));
        }

        return { leads: relLeads, contatos: relContatos, emendas: relEmendas, agendas: relAgendas, votos: relVotos };
    }, [selectedEntity, leads, contatos, emendas, agenda, estado, capital]);

    const valTotal = entityData.emendas.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <div className="space-y-6 w-full max-w-6xl mx-auto pb-12 animate-fade-in">
            <button 
                onClick={() => setSelectedEntity(null)} 
                className="bg-black text-white px-4 py-2 font-black uppercase text-[10px] border-4 border-black hover:bg-gray-800 flex items-center w-fit shadow-[4px_4px_0_0_rgba(17,17,17,1)] active:translate-y-1 active:shadow-none"
            >
                &larr; Voltar
            </button>

            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0_0_rgba(17,17,17,1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#111] border-l-4 border-b-4 border-black"></div>
                <span className="inline-block px-3 py-1 bg-[#EAA221] text-black text-[10px] font-black uppercase tracking-widest border-2 border-black mb-4">
                    Ficha Analítica: {selectedEntity.type}
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tighter leading-none pr-10">{selectedEntity.name}</h1>
                
                {entityData.votos && (
                    <div className="mt-6 flex flex-wrap gap-6 pt-4 border-t-2 border-dashed border-gray-300">
                        <div className="flex items-end gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-gray-500">Votos ({entityData.votos.labelA})</span>
                                <span className="text-2xl font-bold text-gray-400">{entityData.votos.vAntigo.toLocaleString()}</span>
                            </div>
                            <div className="text-gray-400 font-bold mb-1">&rarr;</div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-black">Votos ({entityData.votos.labelN})</span>
                                <span className="text-3xl font-black text-[#C1272D]">{entityData.votos.vNovo.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-px bg-gray-300 hidden sm:block"></div>
                        <div className="flex flex-col justify-end">
                            <span className="text-[10px] font-black uppercase text-gray-500">Classificação Geográfica</span>
                            <span className="text-xl font-black">{entityData.votos.regiao || '-'}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Lideranças CRM (NOVO) */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-[#C1272D] text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.Briefcase/><span className="ml-2">Lideranças Estratégicas (CRM)</span></h3>
                        <span className="font-black text-sm bg-black border-2 border-white px-2">{entityData.contatos.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px]">
                        {entityData.contatos.length > 0 ? (
                            <table className="w-full text-left text-xs">
                                <tbody>
                                    {entityData.contatos.map((c, i) => (
                                        <tr key={i} className="border-b-2 border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setSelectedEntity({type: 'articulador', name: c.articulador})}>
                                            <td className="p-3">
                                                <div className="font-black uppercase leading-tight">{c.nome}</div>
                                                <div className="text-[9px] font-bold text-gray-500 uppercase mt-1 truncate">Articulador: <span className="text-black">{c.articulador || '-'}</span></div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="bg-gray-200 px-2 border border-black text-[9px] font-black uppercase inline-block max-w-[120px] truncate">{c.situacao || 'S/ Status'}</span>
                                                <div className="text-[9px] font-bold text-gray-500 uppercase mt-1 truncate max-w-[120px]">{c.tema}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <div className="p-6 text-center text-gray-400 font-bold uppercase text-xs">Nenhum contato estratégico.</div>}
                    </div>
                </div>

                {/* Emendas */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-[#EAA221] border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.FileText/><span className="ml-2">Emendas (Total: {formatCurrency(valTotal)})</span></h3>
                        <span className="font-black text-sm bg-white border-2 border-black px-2">{entityData.emendas.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px] p-2 space-y-2">
                        {entityData.emendas.length > 0 ? entityData.emendas.map((e, i) => (
                            <div key={i} className="border-2 border-black p-2 bg-white">
                                <div className="font-black text-sm uppercase leading-tight mb-1 line-clamp-2">{e.objeto}</div>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-[9px] font-bold text-gray-500 uppercase bg-gray-200 px-1 border border-gray-300">{e.tema}</span>
                                    <span className="font-black text-xs text-[#007D8A]">{formatCurrency(e.total)}</span>
                                </div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>

                {/* Agendas */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-[#007D8A] text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.Calendar/><span className="ml-2">Agendas Realizadas</span></h3>
                        <span className="font-black text-sm bg-black border-2 border-white px-2">{entityData.agendas.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] p-2 space-y-2">
                        {entityData.agendas.length > 0 ? entityData.agendas.map((a, i) => (
                            <div key={i} className="border-2 border-black p-2 bg-white flex flex-col">
                                <div className="font-black text-xs uppercase leading-tight mb-1 line-clamp-2">{a.titulo}</div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase">Artic: <span className="text-black">{a.articulador || '-'}</span></div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>

                {/* Leads Base */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-black text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.Users/><span className="ml-2">Leads (Eventos Antigos)</span></h3>
                        <span className="font-black text-sm bg-white text-black border-2 border-black px-2">{entityData.leads.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] p-2 space-y-2">
                        {entityData.leads.length > 0 ? entityData.leads.map((l, i) => (
                            <div key={i} className="border-b-2 border-gray-200 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0 pl-2">
                                <div className="font-black text-xs uppercase leading-tight truncate">{l.nome}</div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase truncate mt-0.5">{l.tema}</div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

const AppContent = () => {
    const { loadingInfo, selectedEntity, mainView, setMainView } = useContext(AppContext);

    if (loadingInfo.isLoading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-4">
            <div className="w-16 h-16 border-4 border-[#FDFBF7] border-t-[#C1272D] border-r-[#EAA221] border-b-[#007D8A] rounded-full animate-spin mb-8 shadow-md"></div>
            <div className="w-full max-w-xs bg-white border-4 border-black p-4 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col gap-3 text-center">
                <p className="text-xs font-black tracking-widest uppercase text-black">{loadingInfo.stage}</p>
                <div className="w-full h-3 bg-gray-200 border-2 border-black overflow-hidden">
                    <div className="h-full bg-black transition-all duration-300 ease-out" style={{ width: `${loadingInfo.progress}%` }}></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#FDFBF7] text-[#111111] font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#111 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
                
                {!selectedEntity && (
                    <div className="flex border-b-4 border-black bg-white z-10 shadow-sm shrink-0 overflow-x-auto">
                        <button onClick={() => setMainView('dashboard')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-r-4 border-black transition-colors whitespace-nowrap ${mainView === 'dashboard' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Painel Analítico</button>
                        <button onClick={() => setMainView('lista_sc')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-r-4 border-black transition-colors whitespace-nowrap ${mainView === 'lista_sc' ? 'bg-[#EAA221] text-black' : 'hover:bg-gray-100'}`}>Raio-X: Estado</button>
                        <button onClick={() => setMainView('lista_floripa')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest transition-colors whitespace-nowrap ${mainView === 'lista_floripa' ? 'bg-[#007D8A] text-white' : 'hover:bg-gray-100'}`}>Raio-X: Capital</button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 relative z-10 custom-scrollbar">
                    {selectedEntity ? <FichaCompleta /> : (
                        mainView === 'dashboard' ? <Dashboard /> :
                        mainView === 'lista_sc' ? <ListaMunicipios /> :
                        <ListaCapital />
                    )}
                </div>
            </main>
        </div>
    );
};

export default function App() {
    return (
        <AppProvider>
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px;}
                .custom-scrollbar::-webkit-scrollbar-track { background: #FDFBF7; border-left: 2px solid #111; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; }
                * { scrollbar-color: #111 #FDFBF7; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}} />
            <AppContent />
        </AppProvider>
    );
}
