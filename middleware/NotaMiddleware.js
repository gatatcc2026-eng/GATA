module.exports = class NotaMiddleware {

    static validateCreate(req, res, next) {
        try {
            const { nota, bimestre, idAlunoDisciplinaProfessor } = req.body;

            if (nota === undefined || bimestre === undefined || idAlunoDisciplinaProfessor === undefined) {
                return res.status(400).json({
                    error: "nota, bimestre e idAlunoDisciplinaProfessor são obrigatórios!"
                });
            }

            const notaParsed = Number(nota);
            if (Number.isNaN(notaParsed) || notaParsed < 0 || notaParsed > 10) {
                return res.status(400).json({
                    error: "Nota deve ser um número entre 0 e 10!"
                });
            }

            const bimestreParsed = Number.isInteger(Number(bimestre))
                ? Number(bimestre)
                : parseInt(String(bimestre).charAt(0));

            if (!Number.isInteger(bimestreParsed) || bimestreParsed < 1 || bimestreParsed > 4) {
                return res.status(400).json({
                    error: "Bimestre deve ser entre 1 e 4!"
                });
            }

            const fkParsed = Number(idAlunoDisciplinaProfessor);
            if (!Number.isInteger(fkParsed) || fkParsed <= 0) {
                return res.status(400).json({
                    error: "idAlunoDisciplinaProfessor inválido!"
                });
            }

            req.body.nota                        = notaParsed;
            req.body.bimestre                    = `${bimestreParsed}º Bimestre`;
            req.body.idAlunoDisciplinaProfessor  = fkParsed;

            next();

        } catch (error) {
            return res.status(500).json({ error: "Erro na validação!" });
        }
    }


    static validateUpdate(req, res, next) {
        try {
            const { idNota } = req.params;
            const { nota, bimestre, idAlunoDisciplinaProfessor } = req.body;

            const idParsed = Number(idNota);
            if (!Number.isInteger(idParsed) || idParsed <= 0) {
                return res.status(400).json({ error: "idNota inválido!" });
            }
            req.params.idNota = idParsed;

            if (nota !== undefined) {
                const parsed = Number(nota);
                if (Number.isNaN(parsed) || parsed < 0 || parsed > 10) {
                    return res.status(400).json({ error: "Nota inválida!" });
                }
                req.body.nota = parsed;
            }

            if (bimestre !== undefined) {
                // aceita número (1) ou string ("1º Bimestre") — igual ao validateCreate
                const bimestreParsed = Number.isInteger(Number(bimestre))
                    ? Number(bimestre)
                    : parseInt(String(bimestre).charAt(0));

                if (!Number.isInteger(bimestreParsed) || bimestreParsed < 1 || bimestreParsed > 4) {
                    return res.status(400).json({ error: "Bimestre deve ser entre 1 e 4!" });
                }
                req.body.bimestre = `${bimestreParsed}º Bimestre`;
            }

            if (idAlunoDisciplinaProfessor !== undefined) {
                const parsed = Number(idAlunoDisciplinaProfessor);
                if (!Number.isInteger(parsed) || parsed <= 0) {
                    return res.status(400).json({ error: "idAlunoDisciplinaProfessor inválido!" });
                }
                req.body.idAlunoDisciplinaProfessor = parsed;
            }

            next();

        } catch (error) {
            return res.status(500).json({ error: "Erro na validação!" });
        }
    }


    static validateId(req, res, next) {
        try {
            const { idNota } = req.params;

            const parsed = Number(idNota);
            if (!Number.isInteger(parsed) || parsed <= 0) {
                return res.status(400).json({ error: "ID inválido!" });
            }

            req.params.idNota = parsed;
            next();

        } catch (error) {
            return res.status(500).json({ error: "Erro na validação do ID!" });
        }
    }
};