const CursoService = require("../service/CursoService");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class CursoControl {
    #cursoService;

    /**
     * @param {CursoService} cursoServiceDependency
     */
    constructor(cursoServiceDependency) {
        console.log("✅ CursoControl.constructor()");
        this.#cursoService = cursoServiceDependency;
    }

    // cria os cursos
    store = async (req, res) => {
        console.log("✅ CursoControl.store()");
        try {
            const novoCurso = await this.#cursoService.createCurso(req.body);

            return res.status(201).json({
                message: "Curso criado com sucesso!",
                idCurso: novoCurso
            });

        } catch (error) {
            console.error("❌ Erro em CursoControl.store():", error);

            return res.status(400).json({
                error: error.message || "Erro ao criar curso!"
            });
        }
    };

    // lista todos os cursos
    index = async (req, res) => {
        console.log("✅ CursoControl.index()");
        try {
            const cursos = await this.#cursoService.findAll();

            return res.status(200).json(cursos);

        } catch (error) {
            console.error("❌ Erro em CursoControl.index():", error);

            return res.status(500).json({
                error: error.message || "Erro ao buscar cursos!"
            });
        }
    };

    // busca por id
    show = async (req, res) => {
        console.log("✅ CursoControl.show()");
        try {
            const { idCurso } = req.params;

            const curso = await this.#cursoService.findById(idCurso);

            if (!curso) {
                return res.status(404).json({
                    error: "Curso não encontrado!"
                });
            }

            return res.status(200).json(curso);

        } catch (error) {
            console.error("❌ Erro em CursoControl.show():", error);

            return res.status(500).json({
                error: error.message || "Erro ao buscar curso!"
            });
        }
    };

    update = async (req, res) => {
        console.log("✅ CursoControl.update()");
        try {
            const { idCurso } = req.params;

            const atualizado = await this.#cursoService.updateCurso({
                idCurso,
                ...req.body
            });

            if (!atualizado) {
                return res.status(404).json({
                    error: "Curso não encontrado!"
                });
            }

            return res.status(200).json({
                message: "Curso atualizado com sucesso!"
            });

        } catch (error) {
            console.error("❌ Erro em CursoControl.update():", error);

            return res.status(400).json({
                error: error.message || "Erro ao atualizar curso!"
            });
        }
    };

    destroy = async (req, res) => {
        console.log("✅ CursoControl.destroy()");
        try {
            const { idCurso } = req.params;

            const deletado = await this.#cursoService.delete(idCurso);

            if (!deletado) {
                return res.status(404).json({
                    error: "Curso não encontrado!"
                });
            }

            return res.status(200).json({
                message: "Curso deletado com sucesso!"
            });

        } catch (error) {
            console.error("❌ Erro em CursoControl.destroy():", error);

            if (error instanceof ErrorResponse) {
                return res.status(error.httpCode).json({
                    error: error.message,
                    details: error.error
                });
            }

            return res.status(400).json({
                error: error.message || "Erro ao deletar curso!"
            });
        }
    };
};