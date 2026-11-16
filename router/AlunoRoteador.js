const AlunoControl = require("../control/AlunoControl");
const JwtMiddleware = require("../middleware/JwtMiddleware");
const AlunoMiddleware = require("../middleware/AlunoMiddleware");
const {
    exigirProfessor,
    exigirCoordenador,
    alunoSoVeASiMesmo,
    removerSenhaDaResposta
} = require("../middleware/PapelMiddleware");

module.exports = class AlunoRoteador {
    #router;
    #alunoControl;
    #jwtMiddleware;
    #alunoMiddleware;

    constructor(router, jwtMiddleware, alunoMiddleware, alunoControl) {
        console.log("✅ AlunoRoteador.constructor()");
        this.#router = router;
        this.#jwtMiddleware = jwtMiddleware;
        this.#alunoMiddleware = alunoMiddleware;
        this.#alunoControl = alunoControl;
    }

    createRoutes = () => {

        /*
         * Confere se todos os handlers existem antes de registrar as
         * rotas. Se algum estiver undefined, o erro diz QUAL é (em vez
         * de "argument handler must be a function").
         */

        const obrigatorios = {
            "jwtMiddleware.validateToken": this.#jwtMiddleware?.validateToken,
            "PapelMiddleware.exigirCoordenador": exigirCoordenador,
            "PapelMiddleware.exigirProfessor": exigirProfessor,
            "PapelMiddleware.alunoSoVeASiMesmo": alunoSoVeASiMesmo,
            "PapelMiddleware.removerSenhaDaResposta": removerSenhaDaResposta,
            "alunoMiddleware.validateBody": this.#alunoMiddleware?.validateBody,
            "alunoMiddleware.validateLoginBody": this.#alunoMiddleware?.validateLoginBody,
            "alunoMiddleware.validateMatriculaParam": this.#alunoMiddleware?.validateMatriculaParam,
            "alunoMiddleware.validateUpdateBody": this.#alunoMiddleware?.validateUpdateBody,
            "alunoControl.limparRegistros": this.#alunoControl?.limparRegistros,
            "alunoControl.store": this.#alunoControl?.store,
            "alunoControl.login": this.#alunoControl?.login,
            "alunoControl.index": this.#alunoControl?.index,
            "alunoControl.disciplinasDoAluno": this.#alunoControl?.disciplinasDoAluno,
            "alunoControl.professoresDoAluno": this.#alunoControl?.professoresDoAluno,
            "alunoControl.show": this.#alunoControl?.show,
            "alunoControl.atualizarDisciplinas": this.#alunoControl?.atualizarDisciplinas,
            "alunoControl.update": this.#alunoControl?.update,
            "alunoControl.destroyComNotas": this.#alunoControl?.destroyComNotas,
            "alunoControl.destroy": this.#alunoControl?.destroy
        };

        const faltando = Object.entries(obrigatorios)
            .filter(([, handler]) => typeof handler !== "function")
            .map(([nome]) => nome);

        if (faltando.length > 0) {
            throw new Error(
                "AlunoRoteador: handler(s) undefined: " + faltando.join(", ")
            );
        }

        // Limpar alunos do curso (só coordenador; o service ainda pede a senha)
        this.#router.post("/limpar-registros",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#alunoControl.limparRegistros
        );

        // Cadastrar aluno (só coordenador, com token)
        this.#router.post("/",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            removerSenhaDaResposta,
            this.#alunoMiddleware.validateBody,
            this.#alunoControl.store
        );

        // Login (único endpoint sem JWT)
        this.#router.post("/login",
            this.#alunoMiddleware.validateLoginBody,
            this.#alunoControl.login
        );

        // Listar alunos (professor/coordenador; aluno não)
        this.#router.get("/",
            this.#jwtMiddleware.validateToken,
            exigirProfessor,
            removerSenhaDaResposta,
            this.#alunoControl.index
        );

        // Disciplinas do aluno + quais já têm nota (aluno só vê as próprias)
        this.#router.get("/:matricula/disciplinas",
            this.#jwtMiddleware.validateToken,
            alunoSoVeASiMesmo,
            this.#alunoMiddleware.validateMatriculaParam,
            this.#alunoControl.disciplinasDoAluno
        );

        // Professor de cada disciplina da turma do aluno (aluno só vê os próprios)
        this.#router.get("/:matricula/professores",
            this.#jwtMiddleware.validateToken,
            alunoSoVeASiMesmo,
            this.#alunoMiddleware.validateMatriculaParam,
            this.#alunoControl.professoresDoAluno
        );

        // Buscar aluno (aluno só vê o próprio)
        this.#router.get("/:matricula",
            this.#jwtMiddleware.validateToken,
            alunoSoVeASiMesmo,
            removerSenhaDaResposta,
            this.#alunoMiddleware.validateMatriculaParam,
            this.#alunoControl.show
        );

        // Atualizar disciplinas do aluno (só coordenador do curso do aluno)
        this.#router.put("/disciplinas/:matricula",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#alunoMiddleware.validateMatriculaParam,
            this.#alunoControl.atualizarDisciplinas
        );

        // Editar aluno (só coordenador)
        this.#router.put("/:matricula",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            removerSenhaDaResposta,
            this.#alunoMiddleware.validateMatriculaParam,
            this.#alunoMiddleware.validateUpdateBody,
            this.#alunoControl.update
        );

        // Excluir aluno COM notas (só coordenador, confirmando a senha)
        this.#router.post("/:matricula/excluir-com-notas",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#alunoMiddleware.validateMatriculaParam,
            this.#alunoControl.destroyComNotas
        );

        // Excluir aluno (só coordenador)
        this.#router.delete("/:matricula",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#alunoMiddleware.validateMatriculaParam,
            this.#alunoControl.destroy
        );

        return this.#router;
    }
}