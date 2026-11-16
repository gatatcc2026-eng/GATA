const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class SolicitacaoProfessorService {

    #solicitacaoDAO;
    #professorCursoDAO;
    #professorDAO;
    #cursoDAO;
    #historicoCoordenadorService;


    constructor(
        solicitacaoDAO,
        professorCursoDAO,
        professorDAO,
        cursoDAO,
        historicoCoordenadorService
    ) {

        console.log("✅ SolicitacaoProfessorService.constructor()");

        this.#solicitacaoDAO = solicitacaoDAO;
        this.#professorCursoDAO = professorCursoDAO;
        this.#professorDAO = professorDAO;
        this.#cursoDAO = cursoDAO;
        this.#historicoCoordenadorService = historicoCoordenadorService;
    }


    // =========================================================
    // HELPERS
    // =========================================================

    // Curso que o usuário logado coordena (vem do JWT). Sem ele, não é coordenador.
    #cursoDoCoordenador = (usuario) => {

        const idCurso = Number(usuario?.cursoCoordenado);

        if (!idCurso) {
            throw new ErrorResponse(403, "Apenas coordenadores podem fazer isso.");
        }

        return idCurso;
    };


    // Histórico é best-effort: se falhar, não derruba a operação.
    // >>> Se o método do seu HistoricoCoordenadorService tiver outro nome/parâmetros, ajuste só aqui. <<<
    #registrarHistorico = async (registro, acao, descricao) => {

        try {

            if (typeof this.#historicoCoordenadorService?.registrar === "function") {

                await this.#historicoCoordenadorService.registrar(registro, acao, descricao);
            }

        } catch (error) {

            console.error("⚠️ Falha ao registrar histórico (ignorada):", error.message);
        }
    };


    // =========================================================
    // BUSCAR PROFESSORES QUE AINDA NÃO ESTÃO NO MEU CURSO
    // =========================================================

    buscarDisponiveis = async (usuario, termo) => {

        const idCurso = this.#cursoDoCoordenador(usuario);

        return await this.#professorCursoDAO.findDisponiveisParaCurso(idCurso, termo);
    };


    // =========================================================
    // LISTAR (recebidas e enviadas do meu curso)
    // =========================================================

    listar = async (usuario) => {

        const idCurso = this.#cursoDoCoordenador(usuario);

        return await this.#solicitacaoDAO.findRelacionadas(idCurso);
    };


    // =========================================================
    // CONTAR PENDENTES PARA EU APROVAR
    // =========================================================

    contarPendentes = async (usuario) => {

        const idCurso = this.#cursoDoCoordenador(usuario);

        return await this.#solicitacaoDAO.contarPendentesParaOrigem(idCurso);
    };


    // =========================================================
    // CRIAR (coordenador do DESTINO pede)
    // =========================================================

    criar = async (usuario, dados) => {

        const idCursoDestino = this.#cursoDoCoordenador(usuario);

        const registroProfessor = Number(dados?.registroProfessor);
        const idCursoOrigem = Number(dados?.idCursoOrigem);

        if (!registroProfessor || !idCursoOrigem) {
            throw new ErrorResponse(400, "Informe o professor e o curso de origem.");
        }

        if (idCursoOrigem === idCursoDestino) {
            throw new ErrorResponse(400, "O curso de origem não pode ser o seu próprio curso.");
        }

        const naOrigem = await this.#professorCursoDAO.existeVinculo(registroProfessor, idCursoOrigem);

        if (!naOrigem) {
            throw new ErrorResponse(400, "Esse professor não pertence ao curso de origem informado.");
        }

        const jaNoDestino = await this.#professorCursoDAO.existeVinculo(registroProfessor, idCursoDestino);

        if (jaNoDestino) {
            throw new ErrorResponse(409, "Esse professor já faz parte do seu curso.");
        }

        const pendente = await this.#solicitacaoDAO.findPendente(registroProfessor, idCursoDestino);

        if (pendente) {
            throw new ErrorResponse(409, "Já existe uma solicitação pendente para esse professor.");
        }

        const idSolicitacao = await this.#solicitacaoDAO.create({
            registroProfessor,
            idCursoOrigem,
            idCursoDestino,
            solicitadoPor: usuario.registro
        });

        await this.#registrarHistorico(
            usuario.registro,
            "Solicitação de professor",
            `Solicitou o professor ${registroProfessor} para o curso ${idCursoDestino} (origem: curso ${idCursoOrigem}).`
        );

        return idSolicitacao;
    };


    // =========================================================
    // ACEITAR / RECUSAR (coordenador da ORIGEM responde)
    // =========================================================

    #carregarParaResponder = async (usuario, idSolicitacao) => {

        const idCursoCoordenado = this.#cursoDoCoordenador(usuario);

        const solicitacao = await this.#solicitacaoDAO.findById(Number(idSolicitacao));

        if (!solicitacao) {
            throw new ErrorResponse(404, "Solicitação não encontrada.");
        }

        if (solicitacao.status !== "Pendente") {
            throw new ErrorResponse(409, `Essa solicitação já foi respondida (${solicitacao.status}).`);
        }

        if (Number(solicitacao.idCursoOrigem) !== idCursoCoordenado) {
            throw new ErrorResponse(403, "Só o coordenador do curso de origem pode responder a solicitação.");
        }

        return solicitacao;
    };


    aceitar = async (usuario, idSolicitacao) => {

        const solicitacao = await this.#carregarParaResponder(usuario, idSolicitacao);

        const ok = await this.#solicitacaoDAO.aceitar(solicitacao.idSolicitacao, usuario.registro);

        if (!ok) {
            throw new ErrorResponse(409, "Essa solicitação não está mais pendente.");
        }

        await this.#registrarHistorico(
            usuario.registro,
            "Solicitação de professor aceita",
            `Aceitou a ida do professor ${solicitacao.registroProfessor} para o curso ${solicitacao.idCursoDestino}.`
        );

        return true;
    };


    recusar = async (usuario, idSolicitacao) => {

        const solicitacao = await this.#carregarParaResponder(usuario, idSolicitacao);

        const ok = await this.#solicitacaoDAO.recusar(solicitacao.idSolicitacao, usuario.registro);

        if (!ok) {
            throw new ErrorResponse(409, "Essa solicitação não está mais pendente.");
        }

        await this.#registrarHistorico(
            usuario.registro,
            "Solicitação de professor recusada",
            `Recusou a ida do professor ${solicitacao.registroProfessor} para o curso ${solicitacao.idCursoDestino}.`
        );

        return true;
    };

};