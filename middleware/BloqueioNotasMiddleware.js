module.exports = class BloqueioNotasMiddleware {

    #configuracaoNotasService;


    constructor(configuracaoNotasService) {

        console.log(
            "✅ BloqueioNotasMiddleware.constructor() (por curso)"
        );

        this.#configuracaoNotasService =
            configuracaoNotasService;
    }


    // =========================================================
    // CURSOS (das disciplinas) DAS NOTAS QUE A REQUISIÇÃO GRAVA
    //
    // PUT/PATCH/DELETE /notas/:idNota -> curso da nota existente
    // POST (ou PUT trocando o vínculo) -> idAlunoDisciplinaProfessor
    //                                     do corpo
    // =========================================================

    #descobrirCursos = async (req) => {

        const cursos =
            new Set();


        const idNota =
            Number(
                String(req.path || "")
                    .split("/")
                    .filter(Boolean)[0]
            );


        if (
            Number.isInteger(idNota) &&
            idNota > 0
        ) {

            const curso =
                await this.#configuracaoNotasService
                    .cursoDaNota(idNota);

            if (curso) {
                cursos.add(curso);
            }
        }


        const idAdp =
            Number(
                req.body?.idAlunoDisciplinaProfessor
            );


        if (
            Number.isInteger(idAdp) &&
            idAdp > 0
        ) {

            const curso =
                await this.#configuracaoNotasService
                    .cursoDoVinculo(idAdp);

            if (curso) {
                cursos.add(curso);
            }
        }


        return [...cursos];
    };


    /*
     * Deve rodar DEPOIS do validateToken (usa req.user).
     *
     * A trava é por curso: com as notas do curso fechadas, só o
     * coordenador DAQUELE curso pode lançar, alterar ou apagar.
     * Professor, ou coordenador de outro curso que leciona nesse
     * curso, fica travado.
     */

    bloquearSeFechado = async (req, res, next) => {

        try {

            const cursos =
                await this.#descobrirCursos(req);


            for (const idCurso of cursos) {

                const fechadas =
                    await this.#configuracaoNotasService
                        .notasFechadasDoCurso(idCurso);


                if (!fechadas) {
                    continue;
                }


                const coordenaEsteCurso =
                    Number(req.user?.cursoCoordenado) ===
                    Number(idCurso);


                if (coordenaEsteCurso) {
                    continue;
                }


                console.log(
                    "⛔ Notas fechadas — bloqueado:",
                    req.user?.registro,
                    "| curso:",
                    idCurso
                );


                return res.status(403).json({

                    error:
                        "As notas deste curso estão fechadas. Fale com o coordenador do curso.",

                    message:
                        "As notas deste curso estão fechadas. Fale com o coordenador do curso."

                });
            }


            return next();

        } catch (error) {

            next(error);
        }
    };

};