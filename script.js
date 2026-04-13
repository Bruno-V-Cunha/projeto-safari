// 1. INICIALIZAÇÃO: Tenta carregar dados salvos ou cria um banco vazio
let bancoPacientes = JSON.parse(localStorage.getItem('meusPacientes')) || {};
let pacienteAtualId = null;

// Ao carregar a página, já mostra a lista de pacientes que estavam salvos
window.onload = () => {
    renderizarLista();
    
    // Checa o tema salvo
    const temaSalvo = localStorage.getItem('temaCalculadora');
    if (temaSalvo === 'claro') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-toggle').innerText = '🌙';
    }
};

function salvarNoDisco() {
    localStorage.setItem('meusPacientes', JSON.stringify(bancoPacientes));
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function adicionarPaciente() {
    const input = document.getElementById('nome-paciente');
    const nome = input.value.trim();

    if (nome === "") {
        mostrarAlerta("Digite o nome do paciente primeiro.");
        return;
    }

    const id = "p_" + Date.now();
    bancoPacientes[id] = {
        nome: nome,
        glasgow: { ocular: 0, verbal: 0, motora: 0 }
    };

    salvarNoDisco();
    input.value = "";
    renderizarLista();
    selecionarPaciente(id);
    toggleSidebar();
}

function renderizarLista() {
    const containerLista = document.getElementById('lista-pacientes');
    containerLista.innerHTML = ""; 

    const grupos = {};
    for (let id in bancoPacientes) {
        const inicial = bancoPacientes[id].nome.charAt(0).toUpperCase();
        if (!grupos[inicial]) grupos[inicial] = [];
        grupos[inicial].push({ id: id, nome: bancoPacientes[id].nome });
    }

    const letrasOrdenadas = Object.keys(grupos).sort();

    letrasOrdenadas.forEach(letra => {
        grupos[letra].sort((a, b) => a.nome.localeCompare(b.nome));

        const divGrupo = document.createElement('div');
        divGrupo.className = 'grupo-letra';

        const header = document.createElement('div');
        header.className = 'letra-header';
        header.innerHTML = `${letra} <span class="seta">▼</span>`;
        
        const ul = document.createElement('ul');
        ul.className = 'lista-pacientes-letra';
        
        header.onclick = () => {
            ul.classList.toggle('aberta');
            const seta = header.querySelector('.seta');
            seta.style.transform = ul.classList.contains('aberta') ? 'rotate(180deg)' : 'rotate(0deg)';
        };

        grupos[letra].forEach(paciente => {
            const li = document.createElement('li');
            li.className = 'item-paciente';
            
            // Texto do nome (clicável para selecionar)
            const spanNome = document.createElement('span');
            spanNome.innerText = paciente.nome;
            spanNome.style.flex = "1";
            spanNome.onclick = (e) => {
                e.stopPropagation(); // Impede conflito com outros cliques
                selecionarPaciente(paciente.id);
            };

            // Botão de Excluir
            const btnExcluir = document.createElement('button');
            btnExcluir.innerHTML = "×"; // Ícone de fechar
            btnExcluir.className = "btn-excluir";
            btnExcluir.onclick = (e) => {
                e.stopPropagation(); // Não seleciona o paciente ao tentar excluir
                confirmarExclusao(paciente.id);
            };

            li.appendChild(spanNome);
            li.appendChild(btnExcluir);
            ul.appendChild(li);
        });

        divGrupo.appendChild(header);
        divGrupo.appendChild(ul);
        containerLista.appendChild(divGrupo);
    });
}

function confirmarExclusao(id) {
    const nome = bancoPacientes[id].nome;
    const modal = document.getElementById('modal-overlay');
    const btnConfirmar = document.getElementById('btn-confirmar-exclusao');
    
    // Atualiza os textos do modal
    document.getElementById('modal-text').innerText = `Deseja realmente excluir os dados de ${nome}? Esta ação não pode ser desfeita.`;
    
    // Abre o modal
    modal.classList.add('show');

    // Configura o que o botão "Excluir" vai fazer (remove eventos antigos antes)
    btnConfirmar.onclick = () => {
        delete bancoPacientes[id];
        
        if (pacienteAtualId === id) {
            pacienteAtualId = null;
            document.getElementById('nome-exibido').innerText = "Nenhum selecionado";
            document.getElementById('pontuacao-total').innerText = "0";
            document.querySelectorAll('.btn-calc').forEach(btn => btn.classList.remove('active'));
        }
        
        salvarNoDisco();
        renderizarLista();
        fecharModal();
        mostrarAlerta(`Paciente ${nome} excluído.`);
    };
}

// Função para fechar o modal
function fecharModal() {
    document.getElementById('modal-overlay').classList.remove('show');
}

function selecionarPaciente(id) {
    pacienteAtualId = id;
    const p = bancoPacientes[id];

    // Atualiza o nome no topo
    document.getElementById('nome-exibido').innerText = p.nome;

    // 1. Limpa todos os botões ativos antes de marcar os novos
    document.querySelectorAll('.btn-calc').forEach(btn => btn.classList.remove('active'));

    // 2. Recupera a pontuação salva e marca os botões correspondentes
    const categorias = ['ocular', 'verbal', 'motora'];
    categorias.forEach(cat => {
        const valorSalvo = p.glasgow[cat];
        if (valorSalvo > 0) {
            // Procura o botão que pertence a essa categoria e tem esse valor
            const section = document.getElementById(cat);
            const botoes = section.querySelectorAll('.btn-calc');
            botoes.forEach(btn => {
                // Usamos uma técnica para pegar o número dentro do parênteses (ex: "À voz (3)")
                if (btn.innerText.includes(`(${valorSalvo})`)) {
                    btn.classList.add('active');
                }
            });
        }
    });

    atualizarTotalTela();
    toggleSidebar(); 
}

function calcularGlasgow(categoria, valor, elemento) {
    if (!pacienteAtualId) {
        mostrarAlerta("Selecione um paciente no menu lateral primeiro!");
        return;
    }

    // Marca visualmente o botão
    const botoesDaCategoria = elemento.parentElement.querySelectorAll('.btn-calc');
    botoesDaCategoria.forEach(btn => btn.classList.remove('active'));
    elemento.classList.add('active');

    // Salva o dado no objeto e no LocalStorage
    bancoPacientes[pacienteAtualId].glasgow[categoria] = valor;
    salvarNoDisco();
    
    atualizarTotalTela();
}

function atualizarTotalTela() {
    if (!pacienteAtualId) return;
    
    const p = bancoPacientes[pacienteAtualId];
    const total = p.glasgow.ocular + p.glasgow.verbal + p.glasgow.motora;
    const scoreElement = document.getElementById('pontuacao-total');
    
    scoreElement.innerText = total;

    // Só dispara o alerta se o médico já tiver preenchido as 3 categorias
    if (p.glasgow.ocular > 0 && p.glasgow.verbal > 0 && p.glasgow.motora > 0) {
        
        if (total <= 8) {
            mostrarAlerta("🚨 TCE GRAVE: Glasgow ≤ 8. Risco de via aérea, considerar intubação.");
        } 
        else if (total >= 9 && total <= 12) {
            mostrarAlerta("⚠️ TCE MODERADO: Pontuação entre 9 e 12.");
        } 
        else if (total >= 13 && total <= 15) {
            mostrarAlerta("✅ TCE LEVE: Pontuação entre 13 e 15.");
        }
    }
}

function mostrarAlerta(mensagem) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<div class="toast-icon">!</div><div class="toast-message">${mensagem}</div>`;
    container.appendChild(toast);
    toast.offsetHeight;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500); 
    }, 4000);
}

// Função para alternar o tema
function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('theme-toggle');
    
    // Alterna a classe no body
    body.classList.toggle('light-mode');
    
    // Verifica se a classe está lá agora
    const isLight = body.classList.contains('light-mode');
    
    // Muda o ícone do botão
    btn.innerText = isLight ? '🌙' : '☀️';
    
    // Salva a preferência no disco
    localStorage.setItem('temaCalculadora', isLight ? 'claro' : 'escuro');
}

// Limpa os botões selecionados sem apagar o paciente do banco
function limparAvaliacao() {
    if (!pacienteAtualId) return;

    // Reseta os dados no banco de dados
    bancoPacientes[pacienteAtualId].glasgow = { ocular: 0, verbal: 0, motora: 0 };
    
    // Salva a alteração
    salvarNoDisco();
    
    // Reseta a interface
    document.getElementById('pontuacao-total').innerText = "0";
    document.querySelectorAll('.btn-calc').forEach(btn => btn.classList.remove('active'));
    
    mostrarAlerta("Avaliação resetada.");
}

async function exportarDados() {
    if (Object.keys(bancoPacientes).length === 0) {
        mostrarAlerta("Não há pacientes para exportar.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório Clínico');

    // 1. Configurar as Colunas (Largura e Cabeçalho)
    worksheet.columns = [
        { header: 'Paciente', key: 'nome', width: 25 },
        { header: 'Ocular', key: 'ocular', width: 10 },
        { header: 'Verbal', key: 'verbal', width: 10 },
        { header: 'Motora', key: 'motora', width: 10 },
        { header: 'Total', key: 'total', width: 10 },
        { header: 'Classificação', key: 'status', width: 20 },
        { header: 'Data/Hora', key: 'data', width: 25 },
    ];

    // 2. Adicionar os dados dos pacientes
    for (let id in bancoPacientes) {
        const p = bancoPacientes[id];
        const total = p.glasgow.ocular + p.glasgow.verbal + p.glasgow.motora;
        
        let status = "N/A";
        if (p.glasgow.ocular > 0) {
            if (total <= 8) status = "TCE GRAVE";
            else if (total <= 12) status = "TCE MODERADO";
            else status = "TCE LEVE";
        }

        worksheet.addRow({
            nome: p.nome,
            ocular: p.glasgow.ocular || 0,
            verbal: p.glasgow.verbal || 0,
            motora: p.glasgow.motora || 0,
            total: total,
            status: status,
            data: new Date().toLocaleString('pt-BR')
        });
    }

    // 3. ESTILIZAÇÃO (Agora funciona!)
    
    // Estilo do Cabeçalho (Linha 1)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF007AFF' } // Azul iOS
        };
        cell.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' },
            size: 12
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            bottom: { style: 'thin', color: { argb: 'FF0056B3' } }
        };
    });

    // Estilo das Linhas de Dados
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                // Alinha o nome à esquerda
                if (cell.address.includes('A')) cell.alignment.horizontal = 'left';
                
                // Bordas simples para parecer uma tabela
                cell.border = {
                    bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } }
                };
            });
            
            // Zebra: pinta linhas pares de cinza bem clarinho
            if (rowNumber % 2 === 0) {
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF9F9F9' }
                    };
                });
            }
        }
    });

    // 4. Gerar e baixar o arquivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const dataAtual = new Date().toISOString().slice(0, 10);
    anchor.download = `Glasgow_Pacientes${dataAtual}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);

    mostrarAlerta("Excel gerado! ✅");
}

function calcularRim() {
    const idade = parseFloat(document.getElementById('rim-idade').value);
    const peso = parseFloat(document.getElementById('rim-peso').value);
    const cr = parseFloat(document.getElementById('rim-creatinina').value);
    const sexo = parseFloat(document.getElementById('rim-sexo').value);

    if (!idade || !peso || !cr) {
        mostrarAlerta("Preencha todos os campos do rim.");
        return;
    }

    let resultado = ((140 - idade) * peso) / (72 * cr);
    resultado = (resultado * sexo).toFixed(2);

    const divRes = document.getElementById('resultado-rim');
    divRes.innerHTML = `<strong>Resultado: ${resultado} mL/min</strong>`;
    divRes.style.display = "block";
    
    // Interpretação clínica básica
    if (resultado < 60) {
        divRes.innerHTML += `<br><span style="color: #ff3b30">Atenção: Função renal reduzida.</span>`;
    }
}