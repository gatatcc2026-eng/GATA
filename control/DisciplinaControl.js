const DisciplinaService = require("../service/DisciplinaService");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class DisciplinaControl {
    #disciplinaService;

    /**
     * @param {DisciplinaService} disciplinaServiceDependency
     */
    constructor(disciplinaServiceDependency) {
        console.log("✅ DisciplinaControl.constructor()");
        this.#disciplinaService = disciplinaServiceDependency;
    }

    // resposta de erro padrão (mantém status e detalhes do ErrorResponse)
    #responderErro = (res, error, mensagemPadrao, statusPadrao) => {

        if (error instanceof ErrorResponse) {
            return res.status(error.httpCode).json({
                error: error.message,
                details: error.error
            });
        }

        return res.status(statusPadrao).json({
            error: error.message || mensagemPadrao
        });
    };

    // cria as disciplinas
    store = async (req, res) => {
        console.log("✅ DisciplinaControl.store()");
        try {
            const novaDisciplina = await this.#disciplinaService.createDisciplina(req.body);

            return res.status(201).json({
                message: "Disciplina criada com sucesso!",
                idDisciplina: novaDisciplina
            });

        } catch (error) {
            console.error("❌ Erro em DisciplinaControl.store():", error);

            return this.#responderErro(res, error, "Erro ao criar disciplina!", 400);
        }
    };

    // lista as disciplinas
    //
    // Coordenador: só as do curso que ele coordena.
    // ?lecionando=true: também as de outros cursos em que o próprio
    // usuário logado tem vínculo (tela de Lançar Notas).
    index = async (req, res) => {
        console.log("✅ DisciplinaControl.index()");

        try {

            const cursoCoordenado = req.user?.cursoCoordenado;
            const meuRegistro = Number(req.user?.registro);
            const incluirLecionando = req.query?.lecionando === "true";

            let disciplinas = await this.#disciplinaService.findAll();

            if (cursoCoordenado) {
                disciplinas = disciplinas.filter(disciplina =>

                    Number(disciplina.Curso_idCurso) === Number(cursoCoordenado) ||

                    (
                        incluirLecionando &&
                        Array.isArray(disciplina.professores) &&
                        disciplina.professores.some(
                            vinculo => Number(vinculo.registro) === meuRegistro
                        )
                    )
                );
            }

            return res.status(200).json(disciplinas);

        } catch (error) {
            console.error("❌ Erro em DisciplinaControl.index():", error);

            return res.status(500).json({
                error: error.message || "Erro ao buscar disciplinas!"
            });
        }
    };

    // busca por id
    show = async (req, res) => {
        console.log("✅ DisciplinaControl.show()");
        try {
            const { idDisciplina } = req.params;

            const disciplina = await this.#disciplinaService.findById(idDisciplina);

            if (!disciplina) {
                return res.status(404).json({
                    error: "Disciplina não encontrada!"
                });
            }

            return res.status(200).json(disciplina);

        } catch (error) {
            console.error("❌ Erro em DisciplinaControl.show():", error);

            return res.status(500).json({
                error: error.message || "Erro ao buscar disciplina!"
            });
        }
    };

    update = async (req, res) => {
        console.log("✅ DisciplinaControl.update()");
        try {
            const { idDisciplina } = req.params;

            const atualizado = await this.#disciplinaService.updateDisciplina({
                idDisciplina,
                ...req.body
            });

            if (!atualizado) {
                return res.status(404).json({
                    error: "Disciplina não encontrada!"
                });
            }

            return res.status(200).json({
                message: "Disciplina atualizada com sucesso!"
            });

        } catch (error) {
            console.error("❌ Erro em DisciplinaControl.update():", error);

            return this.#responderErro(res, error, "Erro ao atualizar disciplina!", 400);
        }
    };

    destroy = async (req, res) => {
        console.log("✅ DisciplinaControl.destroy()");
        try {
            const { idDisciplina } = req.params;

            const deletado = await this.#disciplinaService.delete(idDisciplina);

            if (!deletado) {
                return res.status(404).json({
                    error: "Disciplina não encontrada!"
                });
            }

            return res.status(200).json({
                message: "Disciplina deletada com sucesso!"
            });

        } catch (error) {
            console.error("❌ Erro em DisciplinaControl.destroy():", error);

            return this.#responderErro(res, error, "Erro ao deletar disciplina!", 400);
        }
    };
};