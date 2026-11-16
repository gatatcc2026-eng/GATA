/* =========================================================
   PapelMiddleware

   Controle de acesso por papel (role) e por dono do dado.
   Todos rodam DEPOIS do JwtMiddleware.validateToken, que
   preenche req.user a partir do token assinado.

   Papéis no token:
   - role "aluno"
   - role "professor" (coordenador = professor com coordenador 1)
========================================================= */

const negar = (res, codigo, mensagem) =>
    res.status(codigo).json({ error: mensagem });


/* ---------- por papel ---------- */

const exigirAluno = (req, res, next) => {

    if (req.user?.role === "aluno") {
        return next();
    }

    return negar(res, 403, "Acesso permitido somente para alunos.");
};

const exigirProfessor = (req, res, next) => {

    if (req.user?.role === "professor") {
        return next();
    }

    return negar(res, 403, "Acesso permitido somente para professores.");
};

const exigirCoordenador = (req, res, next) => {

    const coordenador =
        req.user?.role === "professor" &&
        Number(req.user?.coordenador) === 1;

    if (coordenador) {
        return next();
    }

    return negar(res, 403, "Acesso permitido somente para coordenadores.");
};


/* ---------- por dono do dado ----------
   Garante que o id enviado (params ou body) é o do próprio
   usuário do token. Ex.: aluno só age com a própria matrícula.
   origem: "params" | "body"
   campo: nome do campo na requisição
   tokenCampo: "matricula" | "registro"
--------------------------------------------------------- */

const exigirMesmoUsuario = (origem, campo, tokenCampo) => (req, res, next) => {

    const enviado = Number(req[origem]?.[campo]);
    const doToken = Number(req.user?.[tokenCampo]);

    if (Number.isInteger(enviado) && enviado > 0 && enviado === doToken) {
        return next();
    }

    return negar(res, 403, "Você só pode acessar os seus próprios dados.");
};

/* Aluno só vê o próprio registro; professor vê qualquer um */
const alunoSoVeASiMesmo = (req, res, next) => {

    if (req.user?.role === "professor") {
        return next();
    }

    return exigirMesmoUsuario("params", "matricula", "matricula")(req, res, next);
};


/* ---------- filtros de resposta ---------- */

function limparSenha(valor) {

    if (Array.isArray(valor)) {
        return valor.map(limparSenha);
    }

    if (
        valor &&
        typeof valor === "object" &&
        !(valor instanceof Date) &&
        !Buffer.isBuffer(valor)
    ) {

        const limpo = {};

        for (const [chave, conteudo] of Object.entries(valor)) {

            if (chave.toLowerCase() === "senha") continue;

            limpo[chave] = limparSenha(conteudo);
        }

        return limpo;
    }

    return valor;
}

/* Nunca devolve o campo "senha" (hash) ao navegador */
const removerSenhaDaResposta = (req, res, next) => {

    const jsonOriginal = res.json.bind(res);

    res.json = corpo => jsonOriginal(limparSenha(corpo));

    next();
};

/* Aluno só recebe as próprias notas; professor recebe todas */
const filtrarNotasDoAluno = (req, res, next) => {

    if (req.user?.role !== "aluno") {
        return next();
    }

    const jsonOriginal = res.json.bind(res);

    const minha = String(req.user.matricula ?? "");

    res.json = corpo => {

        if (Array.isArray(corpo)) {
            return jsonOriginal(
                corpo.filter(nota =>
                    String(nota.matricula ?? nota.Aluno_matricula ?? "") === minha
                )
            );
        }

        /* nota única (GET /:idNota): só se for dele */
        if (
            corpo &&
            typeof corpo === "object" &&
            !corpo.error &&
            String(corpo.matricula ?? corpo.Aluno_matricula ?? "") !== minha
        ) {
            res.status(403);
            return jsonOriginal({ error: "Você só pode ver as suas próprias notas." });
        }

        return jsonOriginal(corpo);
    };

    next();
};


module.exports = {
    exigirAluno,
    exigirProfessor,
    exigirCoordenador,
    exigirMesmoUsuario,
    alunoSoVeASiMesmo,
    removerSenhaDaResposta,
    filtrarNotasDoAluno
};