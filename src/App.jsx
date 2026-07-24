import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';

const getEnv = (key) => {
    try { return import.meta.env[key]; } catch(e) { return ''; }
};

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

const parseNumberStrict = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let str = String(val).trim();
    if (str === '-' || str === '') return 0;
    str = str.replace(/[R$\s]/g, '');
    if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (/\.\d{3}$/.test(str) || str.split('.').length > 2) {
        str = str.replace(/\./g, '');
    }
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
    return s.includes('florianopolis') || s.includes('floripa') || s.includes('fpolis');
};

const isInvalidData = (str) => {
    if (!str) return true;
    const s = normalizeStr(str);
    return s === '' || s === '-' || s.includes('outros') || s.includes('nao informado') || s.includes('nao definido') || s.includes('tema nao definido');
};

const isPublicInstitution = (str) => {
    const s = normalizeStr(str);
    return s.includes('prefeitura') || s.includes('governo') || s.includes('universidade') || s.includes('udesc') || s.includes('ufsc') || s.includes('fundo') || s.includes('secretaria') || s.includes('ministerio') || s.includes('hospital') || s.includes('policia') || s.includes('bombeiro') || s.includes('cbm') || s.includes('pmsc');
};

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
    return "Outros Temas"; 
};

const parseRowEstado = (row) => {
    const isArray = Array.isArray(row);
    const keys = isArray ? [] : Object.keys(row);
    return {
        Cidade: isArray ? row[0] : row[keys[0]] || row['Cidade'],
        Regiao: isArray ? row[1] : row[keys[1]] || row['Região do Estado'],
        Votos2018: parseNumberStrict(isArray ? row[2] : row[keys[2]]), 
        Votos2022: parseNumberStrict(isArray ? row[3] : row[keys[3]])  
    };
};

const parseRowCapital = (row) => {
    const isArray = Array.isArray(row);
    const keys = isArray ? [] : Object.keys(row);
    return {
        Bairro: isArray ? row[3] : row[keys[3]] || row['Bairro'],       
        Distrito: isArray ? row[4] : row[keys[4]] || row['Distrito'],   
        Regiao: isArray ? row[5] : row[keys[5]] || row['Região'],       
        Votos2022: parseNumberStrict(isArray ? row[8] : row[keys[8]]),  
        Votos2024: parseNumberStrict(isArray ? row[11] : row[keys[11]]) 
    };
};

const Icons = {
    Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    FileText: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
    Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Filter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    Briefcase: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    SortAsc: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><polyline points="18 15 12 9 6 15"></polyline></svg>,
    SortDesc: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><polyline points="6 9 12 15 18 9"></polyline></svg>
};

const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [data, setData] = useState({ leads: [], emendas: [], agenda: [], estado: [], capital: [], contatos: [] });
    const [loadingInfo, setLoadingInfo] = useState({ isLoading: true, stage: 'Iniciando...', progress: 0 });
    const [isMock, setIsMock] = useState(false);
    
    const [selectedEntity, setSelectedEntity] = useState(null); 
    const [territoryScope, setTerritoryScope] = useState('ALL'); 
    const [includeFloripa, setIncludeFloripa] = useState(false); 
    const [globalFilters, setGlobalFilters] = useState({ temas: [], regioes: [] });
    const [mainView, setMainView] = useState('dashboard');

    useEffect(() => {
        const loadData = async () => {
            setLoadingInfo({ isLoading: true, stage: 'Conectando aos servidores...', progress: 10 });
            try {
                const fetchJSON = async (url) => {
                    if(!url) return null;
                    try {
                        const res = await fetch(url, { redirect: 'follow' });
                        if(!res.ok) return null;
                        return await res.json();
                    } catch (e) {
                        return null;
                    }
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
                let dadosGeraisRaw = await fetchJSON(URL_DADOS_GERAIS) || { estado: [], capital: [] };

                let dadosGerais = { estado: [], capital: [] };
                
                if (dadosGeraisRaw.estado && dadosGeraisRaw.estado.length > 0) {
                    const arr = Array.isArray(dadosGeraisRaw.estado[0]) ? dadosGeraisRaw.estado.slice(1) : dadosGeraisRaw.estado;
                    dadosGerais.estado = arr.map(parseRowEstado);
                }
                if (dadosGeraisRaw.capital && dadosGeraisRaw.capital.length > 0) {
                    const arr = Array.isArray(dadosGeraisRaw.capital[0]) ? dadosGeraisRaw.capital.slice(1) : dadosGeraisRaw.capital;
                    dadosGerais.capital = arr.map(parseRowCapital);
                }

                // Mock Fallback
                if (leadsRaw.length === 0 && emendasRaw.length === 0 && dadosGerais.estado.length === 0) {
                    setIsMock(true);
                    leadsRaw = [{ nome: "João", cidade: "Florianópolis", bairroReplan: "Campeche", origem: "Assinatura Horta" }, { nome: "Maria", cidade: "Lages", origem: "Seminário Agroecologia" }];
                    emendasRaw = [{ "NÚMERO DA EMENDA": "202401", "MUNICÍPIO": "Florianópolis", "OBJETO": "Equipamentos", "TOTAL": "150000", "TEMA": "Agricultura urbana", "ARTICULADOR": "Ana", "REGIÃO": "Grande Florianópolis" }];
                    agendaRaw = [{ "Título": "Reunião Comunitária", "Município": "Florianópolis", "Bairro": "Campeche", "Início": new Date().toISOString(), "Articulador": "Ana", "Classe de Atividade": "Comunidade" }];
                    contatosRaw = [{ lideranca: "Assoc. Moradores Campeche", base: "Base Florianópolis", municipio_bairro: "Campeche", regiao: "Sul da Ilha", distrito: "Campeche", situacao: "4 - Comprometido", temas: "Meio Ambiente", articulador: "Ana" }];
                    dadosGerais = {
                        estado: [{ Cidade: "Lages", Regiao: "Serra", Votos2018: 800, Votos2022: 1500 }],
                        capital: [{ Bairro: "Campeche", Distrito: "Campeche", Regiao: "Sul da Ilha", Votos2022: 1800, Votos2024: 2100 }]
                    };
                }

                const leads = leadsRaw.map((l, i) => ({
                    id: `l_${i}`,
                    nome: l['NOME'] || l['nome'] || 'Anônimo',
                    municipio: (l['CIDADE'] || l['cidade'] || '').trim(),
                    bairro: (l['BAIRRO REVISADO + REPLAN'] || l['bairroReplan'] || l['bairro'] || '').trim(),
                    tema: getTemaFromOrigem(l['ORIGEM'] || l['origem'])
                })).filter(l => l.municipio);

                const emendas = emendasRaw.map((e, i) => {
                    const muni = (e['MUNICÍPIO'] || e['municipio'] || '').trim();
                    const razaoSocialRaw = (e['RAZÃO SOCIAL'] || e['razao social'] || '').trim();
                    const esfera = (e['ESFERA DE APLICAÇÃO'] || e['esfera de aplicação'] || '').trim();
                    
                    let razaoSocialFinal = razaoSocialRaw;
                    if (isInvalidData(razaoSocialFinal)) {
                        if (esfera.toLowerCase().includes('munic')) {
                            razaoSocialFinal = 'Prefeitura de ' + muni;
                        } else if (esfera.toLowerCase().includes('estadual')) {
                            razaoSocialFinal = 'Governo do Estado de SC';
                        } else {
                            razaoSocialFinal = 'Entidades Não Informadas';
                        }
                    }

                    return {
                        id: `e_${i}`,
                        numero: e['NÚMERO DA EMENDA'] || e['numero'] || '',
                        municipio: muni,
                        objeto: e['OBJETO'] || e['objeto'] || '',
                        total: parseCurrency(e['TOTAL'] || e['total']),
                        tema: e['TEMA'] || e['tema'] || '',
                        articulador: (e['ARTICULADOR'] || e['articulador'] || '').trim(),
                        regiao: e['REGIÃO'] || e['regiao'] || '',
                        razaoSocial: razaoSocialFinal
                    };
                }).filter(e => e.numero);

                const agenda = agendaRaw.map((a, i) => ({
                    id: `a_${i}`,
                    titulo: a['Título'] || a['titulo'] || '',
                    municipio: (a['Município'] || a['municipio'] || '').trim(),
                    bairro: (a['Bairro'] || a['bairro'] || '').trim(),
                    articulador: (a['Articulador'] || a['articulador'] || '').trim(),
                    classe: a['Classe de Atividade'] || '',
                    inicio: a['Início'] || a['inicio'] || null
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

                setData({ leads, emendas, agenda, contatos, estado: dadosGerais.estado, capital: dadosGerais.capital });

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

const SortableBarChartStacked = ({ data, invalidLabel = 'Não Definidos', invalidValue = 0, onLabelClick, legend1="Lideranças", color1="bg-[#C1272D]", legend2="Leads", color2="bg-black" }) => {
    const [sortDesc, setSortDesc] = useState(true);

    const validData = useMemo(() => data.filter(d => d.visualTotal > 0 && !isInvalidData(d.name)), [data]);

    const sortedData = useMemo(() => [...validData].sort((a, b) => {
        return sortDesc ? b.visualTotal - a.visualTotal : a.visualTotal - b.visualTotal;
    }), [validData, sortDesc]);

    const maxVal = validData.length > 0 ? Math.max(...validData.map(d => d.visualTotal)) : 1;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2 shrink-0">
                <div className="flex gap-2 text-[9px] font-black uppercase">
                    <span className="flex items-center gap-1"><div className={`w-2 h-2 ${color1} border border-black`}></div> {legend1}</span>
                    <span className="flex items-center gap-1"><div className={`w-2 h-2 ${color2} border border-black`}></div> {legend2}</span>
                </div>
                <button onClick={() => setSortDesc(!sortDesc)} className="text-[10px] font-black uppercase text-gray-500 hover:text-black flex items-center transition-colors">
                    Ordem {sortDesc ? 'Decrescente' : 'Crescente'} {sortDesc ? <Icons.SortDesc /> : <Icons.SortAsc />}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar min-h-[150px] max-h-[260px]">
                {sortedData.length === 0 ? (
                    <div className="p-4 text-gray-400 font-bold text-sm uppercase text-center border-2 border-dashed border-gray-300">Nenhum registro validado.</div>
                ) : (
                    sortedData.map((item, idx) => {
                        const s1 = item.segments[0];
                        const s2 = item.segments[1];
                        const val1Str = s1.format ? s1.format(s1.value) : s1.value;
                        const val2Str = s2.format ? s2.format(s2.value) : s2.value;

                        return (
                            <div key={idx}>
                                <div className="flex justify-between text-xs font-black uppercase mb-1 tracking-wider">
                                    <span 
                                        className={`truncate pr-4 ${onLabelClick ? 'cursor-pointer hover:underline text-[#C1272D]' : ''}`}
                                        onClick={() => onLabelClick && onLabelClick(item.name)}
                                    >
                                        {item.name}
                                    </span>
                                    <span>{val1Str} / {val2Str}</span>
                                </div>
                                <div className="h-4 w-full bg-gray-100 border-2 border-black flex overflow-hidden">
                                    {item.segments.map((seg, sIdx) => {
                                        if (seg.visualValue <= 0) return null;
                                        const pct = (seg.visualValue / maxVal) * 100;
                                        return (
                                            <div 
                                                key={sIdx}
                                                className={`h-full border-r-2 border-black transition-all duration-1000 ${seg.colorClass}`} 
                                                style={{ width: `${Math.max(pct, 1.5)}%` }} 
                                                title={`${seg.label}: ${seg.format ? seg.format(seg.value) : seg.value}`}
                                            ></div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="mt-4 pt-2 border-t-2 border-dashed border-gray-300 flex flex-wrap justify-between shrink-0 gap-2">
                <span className="text-[8px] font-bold text-gray-400 uppercase">* Nota: Lideranças têm peso visual estratégico 10x maior que Leads.</span>
                {invalidValue > 0 && <span className="text-[9px] font-bold text-gray-400 uppercase">{invalidLabel}: {invalidValue}</span>}
            </div>
        </div>
    );
};

const SortableBarChart = ({ data, colorClass, valueFormatter = (v) => v, invalidLabel = 'Não Definidos', invalidValue = 0, onLabelClick }) => {
    const [sortDesc, setSortDesc] = useState(true);

    const validData = useMemo(() => data.filter(d => d.value > 0 && !isInvalidData(d.name)), [data]);

    const sortedData = useMemo(() => [...validData].sort((a, b) => {
        return sortDesc ? b.value - a.value : a.value - b.value;
    }), [validData, sortDesc]);

    const maxVal = validData.length > 0 ? Math.max(...validData.map(d => d.value)) : 1;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-end items-center mb-4 border-b-2 border-black pb-2 shrink-0">
                <button onClick={() => setSortDesc(!sortDesc)} className="text-[10px] font-black uppercase text-gray-500 hover:text-black flex items-center transition-colors">
                    Ordem {sortDesc ? 'Decrescente' : 'Crescente'} {sortDesc ? <Icons.SortDesc /> : <Icons.SortAsc />}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar min-h-[150px] max-h-[260px]">
                {sortedData.length === 0 ? (
                    <div className="p-4 text-gray-400 font-bold text-sm uppercase text-center border-2 border-dashed border-gray-300">Nenhum registro validado.</div>
                ) : (
                    sortedData.map((item, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-xs font-black uppercase mb-1 tracking-wider">
                                <span 
                                    className={`truncate pr-4 ${onLabelClick ? 'cursor-pointer hover:underline text-[#C1272D]' : ''}`}
                                    onClick={() => onLabelClick && onLabelClick(item.name)}
                                >
                                    {item.name}
                                </span>
                                <span>{valueFormatter(item.value)}</span>
                            </div>
                            <div className="h-4 w-full bg-gray-100 border-2 border-black flex overflow-hidden">
                                <div 
                                    className={`h-full border-r-2 border-black transition-all duration-1000 ${colorClass}`} 
                                    style={{ width: `${Math.max((item.value / maxVal) * 100, 1.5)}%` }}
                                ></div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-2 border-t-2 border-dashed border-gray-300 flex flex-wrap justify-end shrink-0 gap-2">
                {invalidValue > 0 && <span className="text-[9px] font-bold text-gray-400 uppercase">{invalidLabel}: {valueFormatter(invalidValue)}</span>}
            </div>
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
                if (typeof aValue === 'string') return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc'; 
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
        setSortConfig({ key, direction });
    };

    return { items: sortedItems, requestSort, sortConfig };
};

const ThSortable = ({ label, sortKey, currentSort, onSort, widthClass="" }) => {
    const isActive = currentSort?.key === sortKey;
    return (
        <th onClick={() => onSort(sortKey)} className={`px-4 py-3 font-black border-r-2 border-black cursor-pointer hover:bg-gray-800 hover:text-white transition-colors select-none ${widthClass}`}>
            <div className="flex items-center justify-between gap-2">
                <span>{label}</span>
                <span className={`text-gray-400 ${isActive ? 'text-yellow-400' : 'opacity-50'}`}>
                    {isActive ? (currentSort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
            </div>
        </th>
    );
};

const Sidebar = () => {
    const { emendas, leads, contatos, setSelectedEntity, globalFilters, setGlobalFilters, territoryScope, setTerritoryScope, includeFloripa, setIncludeFloripa, mainView, setMainView } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
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
            add('instituicao', e.razaoSocial, `Instituição: ${e.razaoSocial}`);
        });
        leads.forEach(l => {
            if (isFloripa(l.municipio) && l.bairro) add('bairro', l.bairro, `Bairro: ${l.bairro}`);
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
        <>
            <div className="md:hidden bg-[#EAA221] border-b-4 border-black p-4 flex justify-between items-center z-50">
                <div>
                    <h1 className="text-2xl font-black text-black tracking-tighter uppercase leading-none">TABULUM</h1>
                    <p className="text-[9px] font-black tracking-widest uppercase text-black">Central de Inteligência</p>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="bg-black text-white p-2 border-2 border-black">
                    <Icons.Filter />
                </button>
            </div>

            <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out w-80 bg-[#FDFBF7] border-r-4 border-black flex flex-col z-40 h-full shadow-2xl md:shadow-none`}>
                <div className="hidden md:block p-6 border-b-4 border-black bg-[#EAA221] cursor-pointer" onClick={() => {setSelectedEntity(null); setMainView('dashboard');}}>
                    <h1 className="text-3xl font-black text-black tracking-tighter uppercase leading-none flex items-center gap-2">
                        <img src="https://raw.githubusercontent.com/killuixo/tabulum-central/refs/heads/main/icon-192.png" alt="icon" className="w-8 h-8 object-contain" />
                        TABULUM
                    </h1>
                    <p className="text-[10px] font-black tracking-widest uppercase mt-1 text-black">Central de Inteligência</p>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
                    <div className="p-4 border-b-4 border-black bg-white">
                        <label className="text-[10px] font-black uppercase tracking-widest block mb-2 text-[#C1272D] flex items-center">
                            <Icons.MapPin /> <span className="ml-1">Foco Territorial</span>
                        </label>
                        <div className="flex flex-col gap-2 border-2 border-black p-1 bg-gray-100">
                            <button onClick={() => setTerritoryScope('INTERIOR')} className={`p-2 text-xs font-black uppercase border-2 transition-colors ${territoryScope === 'INTERIOR' ? 'bg-[#C1272D] text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                                Santa Catarina
                            </button>
                            <button onClick={() => setTerritoryScope('CAPITAL')} className={`p-2 text-xs font-black uppercase border-2 transition-colors ${territoryScope === 'CAPITAL' ? 'bg-[#007D8A] text-white border-black' : 'bg-white text-gray-500 border-transparent hover:bg-gray-200'}`}>
                                Florianópolis
                            </button>
                        </div>
                        {territoryScope === 'INTERIOR' && (
                            <label className="flex items-center space-x-2 mt-3 cursor-pointer group w-fit bg-gray-100 p-2 border-2 border-dashed border-gray-400 hover:bg-gray-200">
                                <input type="checkbox" checked={includeFloripa} onChange={e => setIncludeFloripa(e.target.checked)} className="w-4 h-4 accent-black border-2 border-black cursor-pointer" />
                                <span className="text-[10px] font-bold uppercase text-gray-600 group-hover:text-black">Incluir Floripa no Estado</span>
                            </label>
                        )}
                    </div>

                    <div className="p-4 space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Busca Universal</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><Icons.Search /></div>
                                <input type="text" placeholder="Local, articulador, tema..." className="block w-full pl-10 pr-3 py-3 border-4 border-black bg-white font-bold text-sm focus:outline-none focus:border-[#C1272D] transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                {searchResults.length > 0 && (
                                    <ul className="absolute z-50 w-full mt-2 bg-white border-4 border-black max-h-60 overflow-auto shadow-[4px_4px_0_0_rgba(17,17,17,1)]">
                                        {searchResults.map((res, idx) => (
                                            <li key={idx} className="px-4 py-3 hover:bg-[#EAA221] cursor-pointer text-xs font-bold uppercase border-b-2 border-black last:border-0" onClick={() => { setSelectedEntity({type: res.type, name: res.name}); setSearchTerm(''); setMainView('dashboard'); setIsMobileMenuOpen(false); }}>{res.label}</li>
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
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}
        </>
    );
};

const Dashboard = () => {
    const { leads, emendas, agenda, contatos, estado, capital, globalFilters, territoryScope, includeFloripa, isMock, setSelectedEntity } = useContext(AppContext);

    const filterByTerritory = (mun) => {
        const isF = isFloripa(mun);
        if (territoryScope === 'CAPITAL') return isF;
        if (territoryScope === 'INTERIOR') return isF ? includeFloripa : true;
        return true;
    };

    const filteredEmendas = useMemo(() => emendas.filter(e => filterByTerritory(e.municipio) && (globalFilters.regioes.length === 0 || globalFilters.regioes.includes(e.regiao)) && (globalFilters.temas.length === 0 || globalFilters.temas.includes(e.tema))), [emendas, globalFilters, territoryScope, includeFloripa]);
    const filteredLeads = useMemo(() => leads.filter(l => filterByTerritory(l.municipio) && (globalFilters.temas.length === 0 || !l.tema || globalFilters.temas.includes(l.tema))), [leads, globalFilters, territoryScope, includeFloripa]);
    const filteredAgenda = useMemo(() => agenda.filter(a => filterByTerritory(a.municipio)), [agenda, territoryScope, includeFloripa]);
    const filteredContatos = useMemo(() => contatos.filter(c => {
        const isF = c.base.includes('Florianópolis');
        if (territoryScope === 'CAPITAL' && !isF) return false;
        if (territoryScope === 'INTERIOR' && isF && !includeFloripa) return false;
        if (globalFilters.regioes.length > 0 && !globalFilters.regioes.includes(c.regiao)) return false;
        if (globalFilters.temas.length > 0 && !globalFilters.temas.includes(c.tema)) return false;
        return true;
    }), [contatos, globalFilters, territoryScope, includeFloripa]);

    const handleLabelClick = (type, name) => {
        setSelectedEntity({ type, name });
    };

    const crossChartTemasLeads = useMemo(() => {
        const map = {}; let invalid = 0;
        filteredLeads.forEach(l => {
            const t = l.tema;
            if (isInvalidData(t)) { invalid++; return; }
            if(!map[t]) map[t] = { liderancas: 0, leads: 0 };
            map[t].leads += 1;
        });
        filteredContatos.forEach(c => {
            const t = c.tema;
            if (isInvalidData(t)) { invalid++; return; }
            if(!map[t]) map[t] = { liderancas: 0, leads: 0 };
            map[t].liderancas += 1;
        });

        return { 
            data: Object.entries(map).map(([name, counts]) => ({ 
                name, 
                value: 0, 
                visualTotal: (counts.liderancas * 10) + counts.leads, 
                segments: [
                    { value: counts.liderancas, visualValue: counts.liderancas * 10, colorClass: 'bg-[#C1272D]', label: 'Lideranças' },
                    { value: counts.leads, visualValue: counts.leads, colorClass: 'bg-black', label: 'Leads' }
                ]
            })), 
            invalid 
        };
    }, [filteredLeads, filteredContatos]);

    const crossChartTemasEmendas = useMemo(() => {
        const map = {}; let invalid = 0;
        filteredEmendas.forEach(e => { 
            const t = e.tema;
            if (isInvalidData(t)) invalid += e.total; else map[t] = (map[t] || 0) + e.total; 
        });
        return { data: Object.entries(map).map(([name, value]) => ({ name, value, visualTotal: value })), invalid };
    }, [filteredEmendas]);

    const crossChartArticuladores = useMemo(() => {
        const map = {}; let invalid = 0;
        [...filteredAgenda, ...filteredEmendas, ...filteredContatos].forEach(item => {
            const a = item.articulador;
            if (isInvalidData(a)) invalid++; 
            else map[a] = (map[a] || 0) + 1;
        });
        return { data: Object.entries(map).map(([name, value]) => ({ name, value, visualTotal: value })), invalid };
    }, [filteredAgenda, filteredEmendas, filteredContatos]);

    const crossChartLocaisEstado = useMemo(() => {
        const map = {}; let invalid = 0;
        [...filteredLeads, ...filteredContatos].forEach(item => {
            if (!isFloripa(item.municipio) && !(item.base && item.base.includes('Florianópolis'))) {
                const loc = item.municipio || item.municipio_bairro;
                if (isInvalidData(loc)) invalid++; else map[loc] = (map[loc] || 0) + 1;
            }
        });
        return { data: Object.entries(map).map(([name, value]) => ({ name, value, visualTotal: value })), invalid };
    }, [filteredLeads, filteredContatos]);

    const crossChartLocaisCapital = useMemo(() => {
        const map = {}; let invalid = 0;
        [...leads.filter(l => isFloripa(l.municipio)), ...contatos.filter(c => c.base.includes('Florianópolis'))].forEach(item => {
            const loc = item.bairro || item.municipio_bairro;
            if (isInvalidData(loc)) invalid++; else map[loc] = (map[loc] || 0) + 1;
        });
        return { data: Object.entries(map).map(([name, value]) => ({ name, value, visualTotal: value })), invalid };
    }, [leads, contatos]);

    const crossChartVotosEmendasRegiao = useMemo(() => {
        const map = {}; let invalid = 0;
        
        if (territoryScope === 'ALL' || territoryScope === 'INTERIOR') {
            estado.forEach(e => {
                if (isFloripa(e.Cidade) && !includeFloripa) return;
                const r = e.Regiao || 'Não Informado';
                if (!map[r]) map[r] = { votos: 0, emendas: 0 };
                map[r].votos += e.Votos2022 || 0;
            });
        }
        if (territoryScope === 'ALL' || territoryScope === 'CAPITAL') {
            if (territoryScope === 'CAPITAL' || includeFloripa) {
                capital.forEach(c => {
                    const r = c.Regiao || 'Não Informado';
                    if (!map[r]) map[r] = { votos: 0, emendas: 0 };
                    map[r].votos += c.Votos2022 || 0; 
                });
            }
        }

        filteredEmendas.forEach(e => {
            const r = e.regiao;
            if (isInvalidData(r)) invalid += e.total; 
            else {
                if (!map[r]) map[r] = { votos: 0, emendas: 0 };
                map[r].emendas += e.total;
            }
        });

        const maxVotos = Math.max(...Object.values(map).map(d => d.votos), 1);
        const maxEmendas = Math.max(...Object.values(map).map(d => d.emendas), 1);

        return { 
            data: Object.entries(map).map(([name, counts]) => ({ 
                name, 
                value: 0, 
                visualTotal: (counts.votos / maxVotos) + (counts.emendas / maxEmendas),
                segments: [
                    { value: counts.votos, visualValue: counts.votos / maxVotos, colorClass: 'bg-[#C1272D]', label: 'Votos' },
                    { value: counts.emendas, visualValue: counts.emendas / maxEmendas, colorClass: 'bg-[#EAA221]', label: 'Emendas (R$)', format: formatCurrency }
                ]
            })), 
            invalid 
        };
    }, [estado, capital, filteredEmendas, territoryScope, includeFloripa]);

    return (
        <div className="space-y-6 md:space-y-8 w-full max-w-6xl mx-auto pb-12 animate-fade-in">
            {isMock && (
                <div className="bg-black text-white p-4 font-black uppercase text-xs flex items-center border-4 border-[#EAA221] shadow-[4px_4px_0_0_#EAA221]">
                    ⚠️ Demonstração visual (Variáveis não detectadas). Configure as URLs no Vercel para ver dados reais.
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-4 md:mt-8">
                <div className="bg-white border-4 border-black p-4 md:p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col max-h-[600px] md:max-h-[800px]">
                    <h3 className="text-base md:text-lg font-black uppercase border-b-4 border-black pb-2 mb-4 shrink-0">Engajamento vs Investimento (Temas)</h3>
                    <div className="flex-1 space-y-6 overflow-hidden flex flex-col">
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase shrink-0 mb-2">Por Volume de Contatos</p>
                            <SortableBarChartStacked data={crossChartTemasLeads.data} isStacked={true} invalidValue={crossChartTemasLeads.invalid} onLabelClick={(t) => handleLabelClick('tema', t)} />
                        </div>
                        <div className="border-t-2 border-dashed border-gray-300 pt-4 flex-1 flex flex-col overflow-hidden">
                            <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase shrink-0 mb-2">Por R$ Destinado (Emendas)</p>
                            <SortableBarChart data={crossChartTemasEmendas.data} colorClass="bg-[#EAA221]" valueFormatter={formatCurrency} invalidValue={crossChartTemasEmendas.invalid} onLabelClick={(t) => handleLabelClick('tema', t)} invalidLabel="S/ Tema Definido" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6 md:gap-8 max-h-[800px]">
                    <div className="bg-white border-4 border-black p-4 md:p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col flex-1 overflow-hidden min-h-[300px]">
                        <h3 className="text-base md:text-lg font-black uppercase border-b-4 border-black pb-2 mb-2 shrink-0">Performance Articuladores</h3>
                        <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase shrink-0 mb-2">Agendas + Emendas + Lideranças</p>
                        <SortableBarChart data={crossChartArticuladores.data} colorClass="bg-[#C1272D]" invalidValue={crossChartArticuladores.invalid} invalidLabel="S/ Articulador Mapeado" onLabelClick={(t) => handleLabelClick('articulador', t)} />
                    </div>

                    {(territoryScope === 'ALL' || territoryScope === 'INTERIOR') && (
                        <div className="bg-white border-4 border-black p-4 md:p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col flex-1 overflow-hidden min-h-[300px]">
                            <h3 className="text-base md:text-lg font-black uppercase border-b-4 border-black pb-2 mb-2 shrink-0">Top Municípios SC</h3>
                            <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase shrink-0 mb-2">Lideranças + Leads</p>
                            <SortableBarChart data={crossChartLocaisEstado.data} colorClass="bg-[#007D8A]" invalidValue={crossChartLocaisEstado.invalid} invalidLabel="Local Não Informado" onLabelClick={(t) => handleLabelClick('municipio', t)} />
                        </div>
                    )}

                    {(territoryScope === 'CAPITAL') && (
                        <div className="bg-white border-4 border-black p-4 md:p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col flex-1 overflow-hidden min-h-[300px]">
                            <h3 className="text-base md:text-lg font-black uppercase border-b-4 border-black pb-2 mb-2 shrink-0">Top Bairros Floripa</h3>
                            <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase shrink-0 mb-2">Lideranças + Leads</p>
                            <SortableBarChart data={crossChartLocaisCapital.data} colorClass="bg-black" invalidValue={crossChartLocaisCapital.invalid} invalidLabel="Local Não Informado" onLabelClick={(t) => handleLabelClick('bairro', t)} />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:gap-8 mt-6 md:mt-8">
                <div className="bg-white border-4 border-black p-4 md:p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col max-h-[800px]">
                    <h3 className="text-base md:text-lg font-black uppercase border-b-4 border-black pb-2 mb-4 shrink-0">Votos vs Emendas (Regiões SC)</h3>
                    <div className="flex-1 flex flex-col overflow-hidden">
                         <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase shrink-0 mb-2">Comparativo por Região do Estado</p>
                         <SortableBarChartStacked data={crossChartVotosEmendasRegiao.data} invalidValue={crossChartVotosEmendasRegiao.invalid} invalidLabel="Emendas sem Região" onLabelClick={(t) => handleLabelClick('regiao', t)} legend1="Votos" color1="bg-[#C1272D]" legend2="Emendas (R$)" color2="bg-[#EAA221]" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ListaMunicipios = () => {
    const { estado, emendas, contatos, leads, setSelectedEntity, includeFloripa } = useContext(AppContext);

    const dadosAgregados = useMemo(() => {
        const munisMap = {};
        
        estado.forEach(e => {
            const m = normalizeStr(e.Cidade);
            if (isInvalidData(m)) return;
            if (!munisMap[m]) munisMap[m] = { municipio: e.Cidade, regiao: e.Regiao || '-', votos18: 0, votos22: 0, volEmendas: 0, numContatos: 0, numLeads: 0 };
            munisMap[m].votos18 += e.Votos2018 || 0;
            munisMap[m].votos22 += e.Votos2022 || 0;
        });

        emendas.forEach(e => {
            const m = normalizeStr(e.municipio);
            if (isInvalidData(m)) return;
            if (!munisMap[m]) munisMap[m] = { municipio: e.municipio, regiao: e.regiao || '-', votos18: 0, votos22: 0, volEmendas: 0, numContatos: 0, numLeads: 0 };
            munisMap[m].volEmendas += e.total || 0;
        });
        
        contatos.filter(c => c.base.includes('Santa Catarina')).forEach(c => {
            const m = normalizeStr(c.municipio_bairro);
            if (isInvalidData(m)) return;
            if (!munisMap[m]) munisMap[m] = { municipio: c.municipio_bairro, regiao: c.regiao || '-', votos18: 0, votos22: 0, volEmendas: 0, numContatos: 0, numLeads: 0 };
            munisMap[m].numContatos += 1;
        });

        leads.filter(l => !isFloripa(l.municipio)).forEach(l => {
            const m = normalizeStr(l.municipio);
            if (isInvalidData(m)) return;
            if (munisMap[m]) munisMap[m].numLeads += 1;
        });

        return Object.values(munisMap).filter(m => {
            if (isFloripa(m.municipio) && !includeFloripa) return false;
            return true;
        });
    }, [estado, emendas, contatos, leads, includeFloripa]);

    const { items, requestSort, sortConfig } = useSortableData(dadosAgregados, { key: 'votos22', direction: 'desc' });

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#111111] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
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
                            <tr key={i} className="border-b-2 border-gray-200 hover:bg-[#EAA221]/20 transition-colors">
                                <td onClick={() => setSelectedEntity({ type: 'municipio', name: m.municipio })} className="px-4 py-3 border-r-2 border-gray-200 font-black text-sm uppercase cursor-pointer hover:underline text-[#111]">{m.municipio}</td>
                                <td onClick={() => setSelectedEntity({ type: 'regiao', name: m.regiao })} className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:underline">{m.regiao}</td>
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
            if (!bairrosMap[b]) bairrosMap[b] = { bairro: c.Bairro, distrito: c.Distrito || '-', regiao: c.Regiao || '-', votos22: 0, votos24: 0, numContatos: 0, numLeads: 0 };
            bairrosMap[b].votos22 += c.Votos2022 || 0;
            bairrosMap[b].votos24 += c.Votos2024 || 0;
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
                <table className="w-full text-left border-collapse min-w-[800px]">
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
                            <tr key={i} className="border-b-2 border-gray-200 hover:bg-[#007D8A]/20 transition-colors">
                                <td onClick={() => setSelectedEntity({ type: 'bairro', name: b.bairro })} className="px-4 py-3 border-r-2 border-gray-200 font-black text-sm uppercase cursor-pointer hover:underline text-[#111]">{b.bairro}</td>
                                <td onClick={() => setSelectedEntity({ type: 'distrito', name: b.distrito })} className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:underline">{b.distrito}</td>
                                <td onClick={() => setSelectedEntity({ type: 'regiao', name: b.regiao })} className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:underline">{b.regiao}</td>
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

const ListaInstituicoes = () => {
    const { emendas, setSelectedEntity } = useContext(AppContext);

    const dadosAgregados = useMemo(() => {
        const instMap = {};
        let outros = { nome: 'Entidades Não Informadas', isPublic: false, total: 0, qty: 0, municipios: new Set() };
        
        emendas.forEach(e => {
            const r = normalizeStr(e.razaoSocial);
            if (isInvalidData(r) || r.includes('entidades nao informadas')) {
                outros.total += e.total;
                outros.qty += 1;
                outros.municipios.add(e.municipio);
                return;
            }
            if (!instMap[r]) instMap[r] = { nome: e.razaoSocial, isPublic: isPublicInstitution(r), total: 0, qty: 0, municipios: new Set() };
            instMap[r].total += e.total;
            instMap[r].qty += 1;
            instMap[r].municipios.add(e.municipio);
        });

        return {
            main: Object.values(instMap).map(i => ({ ...i, locs: Array.from(i.municipios).join(', ') })),
            outros: { ...outros, locs: Array.from(outros.municipios).join(', ') }
        };
    }, [emendas]);

    const { items, requestSort, sortConfig } = useSortableData(dadosAgregados.main, { key: 'total', direction: 'desc' });

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#111111] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-[#111111] text-white border-b-4 border-black text-xs uppercase">
                        <tr>
                            <ThSortable label="Instituição / Razão Social" sortKey="nome" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/3" />
                            <ThSortable label="Municípios Atendidos" sortKey="locs" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/3" />
                            <ThSortable label="Ocorrências" sortKey="qty" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Total Destinado (R$)" sortKey="total" currentSort={sortConfig} onSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((m, i) => (
                            <tr key={i} onClick={() => setSelectedEntity({ type: 'instituicao', name: m.nome })} className={`border-b-2 border-gray-200 cursor-pointer transition-colors ${m.isPublic ? 'hover:bg-[#C1272D]/10' : 'hover:bg-[#EAA221]/10'}`}>
                                <td className="px-4 py-3 border-r-2 border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 border border-black shrink-0 ${m.isPublic ? 'bg-[#C1272D]' : 'bg-[#EAA221]'}`}></div>
                                        <span className="font-black text-sm uppercase text-[#111] leading-tight">{m.nome}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase truncate max-w-[200px]">{m.locs}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-center">{m.qty}</td>
                                <td className="px-4 py-3 font-black text-[#007D8A] text-right">{formatCurrency(m.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {dadosAgregados.outros.qty > 0 && (
                <div 
                    className="p-4 bg-gray-100 border-2 border-dashed border-gray-400 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors shadow-sm" 
                    onClick={() => setSelectedEntity({ type: 'instituicao', name: 'Entidades Não Informadas' })}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gray-400 border border-black"></div>
                        <div>
                            <span className="font-bold text-xs uppercase text-gray-500 block leading-tight">Outros / Entidades Não Informadas</span>
                            <span className="text-[10px] font-bold text-gray-400 block mt-0.5">{dadosAgregados.outros.qty} Ocorrências</span>
                        </div>
                    </div>
                    <div className="font-black text-gray-500">{formatCurrency(dadosAgregados.outros.total)}</div>
                </div>
            )}

            <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase"><div className="w-3 h-3 bg-[#C1272D] border border-black"></div> Instituições Públicas</div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase"><div className="w-3 h-3 bg-[#EAA221] border border-black"></div> Demais Entidades (OSC)</div>
            </div>
        </div>
    );
};

const SistemaTabulum = () => (
    <div className="space-y-6 w-full max-w-4xl mx-auto pb-12 animate-fade-in">
        <div className="bg-black text-white p-8 border-4 border-black shadow-[8px_8px_0_0_rgba(17,17,17,1)]">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">SISTEMA TABULUM</h1>
            <p className="text-xs md:text-sm font-bold text-gray-300 uppercase tracking-widest">Aplicativos para gestão da informação do mandato de Marquito.</p>
            <div className="mt-6 p-4 border-2 border-dashed border-gray-600 bg-gray-900">
                <p className="text-[10px] md:text-xs font-bold leading-relaxed">
                    Estes aplicativos ainda são protótipos, podem conter falhas. Não compartilhe com ninguém, uso exclusivo da assessoria e articulação da equipe de Marquito.<br/><br/>
                    O quanto mais a equipe utilizar o programa, mais refinado ele vai ficar. Qualquer sugestão, gráficos, filtros, outros programas, relação entre dados, por favor, fale com o assessor Lui.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <a href="https://tabulum-sig-monilegis.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-[#C1272D]">Monitor Legislativo (MoniLegis)</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Monitora as páginas da ALESC pelos Processos Legislativos e Atividades Parlamentares do deputado Marquito.</p>
            </a>
            <a href="https://tabulum-mapel.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-[#EAA221]">Mapa Eleitoral (MapEl)</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Sistematiza o histórico de votações de Marquito, tanto em Florianópolis como por Santa Catarina.</p>
            </a>
            <a href="https://tabulum-gestagen.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-[#007D8A]">Gestão de Agenda</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Vinculada com o Google Calendar do mandato, sistematiza a agenda do deputado.</p>
            </a>
            <a href="https://tabulum-leads.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-black">Leads</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Gestão e análise dos Leads captados em eventos do mandato. Protegido por senha pois contém muitos dados sensíveis, se necessário, consultar Carlos ou Lui para receber acesso.</p>
            </a>
            <a href="https://tabulum-sig-maplid.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-[#C1272D]">Mapa de Lideranças (MapLid)</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Faz gestão e análise dos dados organizados juntos ao Milo sobre as Lideranças parceiras do mandato.</p>
            </a>
            <a href="https://tabulum-sig.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-white border-4 border-black p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(17,17,17,1)] transition-all flex flex-col group">
                <h3 className="text-lg md:text-xl font-black uppercase mb-2 group-hover:text-[#EAA221]">Painel de Utilidade Pública (PUP)</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Auxilia na gestão dos pedidos de Utilidade Pública recebido pelo mandato.</p>
            </a>
        </div>
    </div>
);

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
            
            const v = estado.find(r => matchStr(r.Cidade));
            if (v) relVotos = { type: 'Estado (SC)', vAntigo: v.Votos2018, vNovo: v.Votos2022, labelA: '2018', labelN: '2022', regiao: v.Regiao };
        } 
        else if (type === 'bairro') {
            relLeads = leads.filter(l => isFloripa(l.municipio) && matchStr(l.bairro));
            relContatos = contatos.filter(c => c.base.includes('Florianópolis') && matchStr(c.municipio_bairro));
            relAgendas = agenda.filter(a => isFloripa(a.municipio) && matchStr(a.bairro));
            
            const vArr = capital.filter(r => matchStr(r.Bairro));
            if (vArr.length > 0) {
                const tot22 = vArr.reduce((acc, curr) => acc + curr.Votos2022, 0);
                const tot24 = vArr.reduce((acc, curr) => acc + curr.Votos2024, 0);
                relVotos = { type: 'Capital (Bairro)', vAntigo: tot22, vNovo: tot24, labelA: '2022', labelN: '2024', regiao: vArr[0].Regiao };
            }
        }
        else if (type === 'regiao') {
            relContatos = contatos.filter(c => matchStr(c.regiao));
            relEmendas = emendas.filter(e => matchStr(e.regiao));
        }
        else if (type === 'distrito') {
            relContatos = contatos.filter(c => matchStr(c.distrito));
            const vArr = capital.filter(r => matchStr(r.Distrito));
            if (vArr.length > 0) {
                const tot22 = vArr.reduce((acc, curr) => acc + curr.Votos2022, 0);
                const tot24 = vArr.reduce((acc, curr) => acc + curr.Votos2024, 0);
                relVotos = { type: 'Capital (Distrito)', vAntigo: tot22, vNovo: tot24, labelA: '2022', labelN: '2024', regiao: vArr[0].Regiao };
            }
        }
        else if (type === 'articulador') {
            relContatos = contatos.filter(c => matchStr(c.articulador));
            relEmendas = emendas.filter(e => matchStr(e.articulador));
            relAgendas = agenda.filter(a => matchStr(a.articulador));
        }
        else if (type === 'tema') {
            relContatos = contatos.filter(c => matchStr(c.tema));
            relEmendas = emendas.filter(e => matchStr(e.tema));
            relLeads = leads.filter(l => matchStr(l.tema));
        }
        else if (type === 'instituicao') {
            if (n.includes('entidades nao informadas')) {
                relEmendas = emendas.filter(e => isInvalidData(e.razaoSocial) || normalizeStr(e.razaoSocial).includes('entidades nao informadas'));
            } else {
                relEmendas = emendas.filter(e => matchStr(e.razaoSocial));
            }
        }

        return { leads: relLeads, contatos: relContatos, emendas: relEmendas, agendas: relAgendas, votos: relVotos };
    }, [selectedEntity, leads, contatos, emendas, agenda, estado, capital]);

    const valTotal = entityData.emendas.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <div className="space-y-6 w-full max-w-6xl mx-auto pb-12 animate-fade-in">
            <button onClick={() => setSelectedEntity(null)} className="bg-black text-white px-4 py-2 font-black uppercase text-[10px] border-4 border-black hover:bg-gray-800 flex items-center w-fit shadow-[4px_4px_0_0_rgba(17,17,17,1)] active:translate-y-1 active:shadow-none">
                &larr; Voltar
            </button>

            <div className="bg-white p-6 md:p-8 border-4 border-black shadow-[8px_8px_0_0_rgba(17,17,17,1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#111] border-l-4 border-b-4 border-black"></div>
                <span className="inline-block px-3 py-1 bg-[#EAA221] text-black text-[10px] font-black uppercase tracking-widest border-2 border-black mb-4">
                    Ficha Analítica: {selectedEntity.type}
                </span>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-black uppercase tracking-tighter leading-none pr-10 break-words">{selectedEntity.name}</h1>
                
                {entityData.votos && (
                    <div className="mt-6 flex flex-wrap gap-4 md:gap-6 pt-4 border-t-2 border-dashed border-gray-300">
                        <div className="flex items-end gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-gray-500">Votos ({entityData.votos.labelA})</span>
                                <span className="text-xl md:text-2xl font-bold text-gray-400">{entityData.votos.vAntigo.toLocaleString()}</span>
                            </div>
                            <div className="text-gray-400 font-bold mb-1">&rarr;</div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-black">Votos ({entityData.votos.labelN})</span>
                                <span className="text-2xl md:text-3xl font-black text-[#C1272D]">{entityData.votos.vNovo.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-px bg-gray-300 hidden sm:block"></div>
                        <div className="flex flex-col justify-end">
                            <span className="text-[10px] font-black uppercase text-gray-500">Classificação Geográfica</span>
                            <span className="text-lg md:text-xl font-black cursor-pointer hover:text-[#007D8A]" onClick={() => setSelectedEntity({type: 'regiao', name: entityData.votos.regiao})}>
                                {entityData.votos.regiao || '-'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-[#C1272D] text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center text-sm md:text-base"><Icons.Briefcase/><span className="ml-2">Lideranças Estratégicas</span></h3>
                        <span className="font-black text-sm bg-black border-2 border-white px-2">{entityData.contatos.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px] custom-scrollbar">
                        {entityData.contatos.length > 0 ? (
                            <table className="w-full text-left text-xs">
                                <tbody>
                                    {entityData.contatos.map((c, i) => (
                                        <tr key={i} className="border-b-2 border-gray-200 hover:bg-gray-100 transition-colors">
                                            <td className="p-3">
                                                <div className="font-black uppercase leading-tight">{c.nome}</div>
                                                <div className="text-[9px] font-bold text-gray-500 uppercase mt-1 truncate">Artic: <span className="text-black hover:underline cursor-pointer" onClick={() => setSelectedEntity({type: 'articulador', name: c.articulador})}>{c.articulador || '-'}</span></div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="bg-gray-200 px-2 border border-black text-[9px] font-black uppercase inline-block max-w-[120px] truncate">{c.situacao || 'S/ Status'}</span>
                                                <div className="text-[9px] font-bold text-[#EAA221] uppercase mt-1 truncate max-w-[120px] cursor-pointer hover:underline" onClick={() => setSelectedEntity({type: 'tema', name: c.tema})}>{c.tema}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <div className="p-6 text-center text-gray-400 font-bold uppercase text-xs">Sem lideranças mapeadas.</div>}
                    </div>
                </div>

                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-[#EAA221] border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center text-sm md:text-base"><Icons.FileText/><span className="ml-2">Emendas (Total: {formatCurrency(valTotal)})</span></h3>
                        <span className="font-black text-sm bg-white border-2 border-black px-2">{entityData.emendas.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px] p-2 space-y-2 custom-scrollbar">
                        {entityData.emendas.length > 0 ? entityData.emendas.map((e, i) => (
                            <div key={i} className="border-2 border-black p-2 bg-white">
                                <div className="font-black text-sm uppercase leading-tight mb-1 line-clamp-2">{e.objeto}</div>
                                <div className="text-[9px] font-black text-gray-500 uppercase truncate mb-2">Artic: <span className="text-black hover:underline cursor-pointer" onClick={() => setSelectedEntity({type: 'articulador', name: e.articulador})}>{e.articulador || '-'}</span></div>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-[9px] font-bold text-[#EAA221] uppercase bg-gray-100 px-1 border border-gray-300 cursor-pointer hover:underline" onClick={() => setSelectedEntity({type: 'tema', name: e.tema})}>{e.tema}</span>
                                    <span className="font-black text-xs text-[#007D8A]">{formatCurrency(e.total)}</span>
                                </div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>

                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-[#007D8A] text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center text-sm md:text-base"><Icons.Calendar/><span className="ml-2">Agendas Realizadas</span></h3>
                        <span className="font-black text-sm bg-black border-2 border-white px-2">{entityData.agendas.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] p-2 space-y-2 custom-scrollbar">
                        {entityData.agendas.length > 0 ? entityData.agendas.map((a, i) => (
                            <div key={i} className="border-2 border-black p-2 bg-white flex flex-col">
                                <div className="font-black text-xs uppercase leading-tight mb-1 line-clamp-2">{a.titulo}</div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase">Artic: <span className="text-black hover:underline cursor-pointer" onClick={() => setSelectedEntity({type: 'articulador', name: a.articulador})}>{a.articulador || '-'}</span></div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>

                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-black text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center text-sm md:text-base"><Icons.Users/><span className="ml-2">Leads (Eventos)</span></h3>
                        <span className="font-black text-sm bg-white text-black border-2 border-black px-2">{entityData.leads.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] p-2 space-y-2 custom-scrollbar">
                        {entityData.leads.length > 0 ? entityData.leads.map((l, i) => (
                            <div key={i} className="border-b-2 border-gray-200 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0 pl-2">
                                <div className="font-black text-xs uppercase leading-tight truncate">{l.nome}</div>
                                <div className="text-[9px] font-bold text-[#EAA221] uppercase truncate mt-0.5 cursor-pointer hover:underline" onClick={() => setSelectedEntity({type: 'tema', name: l.tema})}>{l.tema}</div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

const GlobalStats = () => {
    const { leads, emendas, agenda, contatos, estado, capital, territoryScope, includeFloripa, mainView, isMock } = useContext(AppContext);

    const isSistema = mainView === 'sistema';
    
    const filterByTerritory = (mun) => {
        const isF = isFloripa(mun);
        if (mainView === 'lista_floripa') return isF;
        if (mainView === 'lista_sc') return isF ? includeFloripa : true;
        if (territoryScope === 'CAPITAL') return isF;
        if (territoryScope === 'INTERIOR') return isF ? includeFloripa : true;
        return true;
    };

    const targetEmendas = emendas.filter(e => filterByTerritory(e.municipio));
    const targetLeads = leads.filter(l => filterByTerritory(l.municipio));
    const targetAgenda = agenda.filter(a => filterByTerritory(a.municipio));
    const targetContatos = contatos.filter(c => {
        const isF = c.base.includes('Florianópolis');
        if (mainView === 'lista_floripa') return isF;
        if (mainView === 'lista_sc') return isF ? includeFloripa : !isF;
        if (territoryScope === 'CAPITAL' && !isF) return false;
        if (territoryScope === 'INTERIOR' && isF && !includeFloripa) return false;
        return true;
    });

    const statsVotos = useMemo(() => {
        let vAntigo = 0, vNovo = 0;
        const currentScope = mainView === 'lista_floripa' ? 'CAPITAL' : mainView === 'lista_sc' ? 'INTERIOR' : territoryScope;
        
        if (currentScope !== 'CAPITAL') {
            estado.forEach(e => {
                if (isFloripa(e.Cidade) && !includeFloripa) return;
                vAntigo += e.Votos2018;
                vNovo += e.Votos2022;
            });
        }
        
        if (currentScope === 'CAPITAL' || (currentScope === 'ALL' && includeFloripa) || (currentScope === 'INTERIOR' && includeFloripa)) {
            capital.forEach(c => {
                if (currentScope === 'CAPITAL') {
                    vAntigo += c.Votos2022;
                    vNovo += c.Votos2024;
                } else {
                    vNovo += c.Votos2022; 
                }
            });
        }
        return { vAntigo, vNovo, lblAntigo: currentScope === 'CAPITAL' ? '2022' : '2018', lblNovo: currentScope === 'CAPITAL' ? '2024' : '2022' };
    }, [estado, capital, territoryScope, includeFloripa, mainView]);

    const agendasFuturas = useMemo(() => {
        return targetAgenda.filter(a => {
            if (!a.inicio) return false;
            return new Date(a.inicio) > new Date();
        }).length;
    }, [targetAgenda]);

    if (isSistema) return null; // Esconde stats se estiver na aba sistema

    if (mainView === 'lista_instituicoes') {
        const totalValue = emendas.reduce((acc, curr) => acc + curr.total, 0);
        const publicas = emendas.filter(e => isPublicInstitution(e.razaoSocial)).length;
        const osc = emendas.filter(e => !isPublicInstitution(e.razaoSocial) && !e.razaoSocial.includes('Entidades Não Informadas')).length;

        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="bg-[#EAA221] border-4 border-black p-4 sm:p-6 shadow-[6px_6px_0px_0px_#111111] flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest block mb-4 text-black/70">Volume Geral Destinado</span>
                    <div className="text-3xl font-black truncate">{formatCurrency(totalValue)}</div>
                </div>
                <div className="bg-white border-4 border-black p-4 sm:p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><div className="w-2 h-2 bg-[#C1272D] border border-black mr-2"></div> Instituições Públicas</h3>
                    <div className="text-3xl font-black">{publicas}</div>
                    <div className="text-[10px] font-bold mt-1 text-gray-400 uppercase">Ocorrências Mapeadas</div>
                </div>
                <div className="bg-white border-4 border-black p-4 sm:p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><div className="w-2 h-2 bg-[#EAA221] border border-black mr-2"></div> OSCs e Entidades</h3>
                    <div className="text-3xl font-black">{osc}</div>
                    <div className="text-[10px] font-bold mt-1 text-gray-400 uppercase">Ocorrências Mapeadas</div>
                </div>
            </div>
        )
    }

    const isFiltroCapital = mainView === 'lista_floripa' || territoryScope === 'CAPITAL';

    return (
        <div className="space-y-4 md:space-y-6 mb-6">
            {isMock && (
                <div className="bg-black text-white p-4 font-black uppercase text-xs flex items-center border-4 border-[#EAA221] shadow-[4px_4px_0_0_#EAA221]">
                    ⚠️ Demonstração visual (Variáveis não detectadas). Configure as URLs no Vercel para ver dados reais.
                </div>
            )}
            
            <div className={`text-white border-4 border-black p-4 sm:p-6 shadow-[6px_6px_0px_0px_#111111] flex flex-col ${isFiltroCapital ? 'bg-[#007D8A]' : 'bg-[#EAA221] text-black'}`}>
                <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-4 ${isFiltroCapital ? 'text-white/70' : 'text-black/70'}`}>Evolução de Votos ({isFiltroCapital ? 'Capital' : 'SC'})</span>
                    {!isFiltroCapital && (
                        <span className={`text-[8px] font-bold uppercase px-2 py-1 border ${includeFloripa ? 'border-black text-black' : 'border-black/30 text-black/50'}`}>
                            {includeFloripa ? '(Incluindo Floripa)' : '(Omitindo Floripa)'}
                        </span>
                    )}
                </div>
                <div className="flex items-end gap-4 sm:gap-6">
                    <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold opacity-80">{statsVotos.lblAntigo}</span>
                        <span className="text-2xl sm:text-3xl font-black">{statsVotos.vAntigo.toLocaleString()}</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black opacity-50 mb-1">&rarr;</div>
                    <div className="flex flex-col">
                        <span className={`text-xs sm:text-sm font-black px-1 w-fit border-2 border-black ${isFiltroCapital ? 'bg-white text-[#007D8A]' : 'bg-black text-[#EAA221]'}`}>{statsVotos.lblNovo}</span>
                        <span className="text-4xl sm:text-5xl font-black">{statsVotos.vNovo.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white border-4 border-black p-3 sm:p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Briefcase /><span className="ml-1 sm:ml-2">Lideranças (CRM)</span></h3>
                    <div className="text-3xl sm:text-4xl font-black text-[#C1272D]">{targetContatos.length}</div>
                    <div className="h-2 w-full bg-black mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-3 sm:p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Users /><span className="ml-1 sm:ml-2">Leads (Eventos)</span></h3>
                    <div className="text-3xl sm:text-4xl font-black">{targetLeads.length}</div>
                    <div className="h-2 w-full bg-[#007D8A] mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-3 sm:p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between overflow-hidden">
                    <h3 className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.FileText /><span className="ml-1 sm:ml-2">Emendas</span></h3>
                    <div className="text-lg sm:text-2xl font-black truncate" title={formatCurrency(targetEmendas.reduce((acc, curr) => acc + curr.total, 0))}>{formatCurrency(targetEmendas.reduce((acc, curr) => acc + curr.total, 0))}</div>
                    <div className="text-[9px] sm:text-[10px] font-bold mt-1 text-gray-400 uppercase">{targetEmendas.length} Ocorrências</div>
                    <div className="h-2 w-full bg-[#EAA221] mt-2 border border-black"></div>
                </div>
                <div className="bg-white border-4 border-black p-3 sm:p-4 shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-col justify-between">
                    <h3 className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Icons.Calendar /><span className="ml-1 sm:ml-2">Agendas</span></h3>
                    <div className="text-3xl sm:text-4xl font-black">{agendasFuturas} <span className="text-xl sm:text-2xl text-gray-400">/ {targetAgenda.length}</span></div>
                    <div className="text-[9px] sm:text-[10px] font-bold mt-1 text-gray-400 uppercase">Futuras / Totais</div>
                    <div className="h-2 w-full bg-[#C1272D] mt-2 border border-black"></div>
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
                    <div className="flex border-b-4 border-black bg-white z-10 shadow-sm shrink-0 overflow-x-auto custom-scrollbar">
                        <button onClick={() => setMainView('dashboard')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-r-4 border-black transition-colors whitespace-nowrap ${mainView === 'dashboard' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Painel Analítico</button>
                        <button onClick={() => setMainView('lista_sc')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-r-4 border-black transition-colors whitespace-nowrap ${mainView === 'lista_sc' ? 'bg-[#EAA221] text-black' : 'hover:bg-gray-100'}`}>Raio-X: Estado</button>
                        <button onClick={() => setMainView('lista_floripa')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-r-4 border-black transition-colors whitespace-nowrap ${mainView === 'lista_floripa' ? 'bg-[#007D8A] text-white' : 'hover:bg-gray-100'}`}>Raio-X: Capital</button>
                        <button onClick={() => setMainView('lista_instituicoes')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest transition-colors whitespace-nowrap ${mainView === 'lista_instituicoes' ? 'bg-[#C1272D] text-white' : 'hover:bg-gray-100'}`}>Raio-X: Instituições</button>
                        <button onClick={() => setMainView('sistema')} className={`p-4 font-black uppercase text-xs sm:text-sm tracking-widest border-l-4 border-black transition-colors whitespace-nowrap ml-auto ${mainView === 'sistema' ? 'bg-black text-white' : 'bg-gray-200 hover:bg-gray-300 text-black'}`}>Outros Apps</button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 relative z-10 custom-scrollbar">
                    {selectedEntity ? <FichaCompleta /> : (
                        <>
                            <GlobalStats />
                            {mainView === 'dashboard' ? <Dashboard /> :
                             mainView === 'lista_sc' ? <ListaMunicipios /> :
                             mainView === 'lista_instituicoes' ? <ListaInstituicoes /> :
                             mainView === 'sistema' ? <SistemaTabulum /> :
                             <ListaCapital />}
                        </>
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
