module.exports = class AlunoDisciplinaProfessorMiddleware {

    validateCreate(req, res, next) {
        try {
            const { idDisciplina, matricula } = req.body;

            if (idDisciplina === undefined || matricula === undefined) {
                return res.status(400).json({
                    error: "idDisciplina e matricula são obrigatórios!"
                });
            }

            const idDisciplinaParsed = Number(idDisciplina);
            if (!Number.isInteger(idDisciplinaParsed) || idDisciplinaParsed <= 0) {
                return res.status(400).json({
                    error: "idDisciplina deve ser um número inteiro positivo!"
                });
            }

            const matriculaParsed = Number(matricula);
            if (!Number.isInteger(matriculaParsed) || matriculaParsed <= 0) {
                return res.status(400).json({
                    error: "matricula deve ser um número inteiro positivo!"
                });
            }

            req.body.idDisciplina = idDisciplinaParsed;
            req.body.matricula = matriculaParsed;

            next();

        } catch (error) {
            return res.status(500).json({
                error: "Erro na validação do middleware!"
            });
        }
    }

    validateUpdate(req, res, next) {
        try {
            const { idAlunoDisciplinaProfessor, idDisciplina, matricula } = req.body;

            if (!idAlunoDisciplinaProfessor) {
                return res.status(400).json({
                    error: "idAlunoDisciplinaProfessor é obrigatório!"
                });
            }

            const idParsed = Number(idAlunoDisciplinaProfessor);
            if (!Number.isInteger(idParsed) || idParsed <= 0) {
                return res.status(400).json({
                    error: "idAlunoDisciplinaProfessor inválido!"
                });
            }

            req.body.idAlunoDisciplinaProfessor = idParsed;

            if (idDisciplina !== undefined) {
                const parsed = Number(idDisciplina);
                if (!Number.isInteger(parsed) || parsed <= 0) {
                    return res.status(400).json({
                        error: "idDisciplina inválido!"
                    });
                }
                req.body.idDisciplina = parsed;
            }

            if (matricula !== undefined) {
                const parsed = Number(matricula);
                if (!Number.isInteger(parsed) || parsed <= 0) {
                    return res.status(400).json({
                        error: "matricula inválida!"
                    });
                }
                req.body.matricula = parsed;
            }

            next();

        } catch (error) {
            return res.status(500).json({
                error: "Erro na validação do middleware!"
            });
        }
    }

    validateIdParam(req, res, next) {
        try {
            const { idAlunoDisciplinaProfessor } = req.params;

            const parsed = Number(idAlunoDisciplinaProfessor);

            if (!Number.isInteger(parsed) || parsed <= 0) {
                return res.status(400).json({
                    error: "ID inválido!"
                });
            }

            req.params.idAlunoDisciplinaProfessor = parsed;

            next();

        } catch (error) {
            return res.status(500).json({
                error: "Erro na validação do ID!"
            });
        }
    }
};