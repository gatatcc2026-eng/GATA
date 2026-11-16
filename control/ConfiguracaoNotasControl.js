const ErrorResponse =
    require("../utils/ErrorResponse");


module.exports = class ConfiguracaoNotasControl {

    #configuracaoNotasService;


    constructor(configuracaoNotasService) {

        console.log(
            "✅ ConfiguracaoNotasControl.constructor() (por curso)"
        );

        this.#configuracaoNotasService =
            configuracaoNotasService;
    }


    #ehCoordenador = (user) =>
        user?.coordenador === true ||
        Number(user?.coordenador) === 1;


    // =========================================================
    // GET /api/v1/notas-config
    // GET /api/v1/notas-config?idCurso=1
    //
    // Sem idCurso: o curso que o usuário coordena (token).
    // Sem curso nenhum: lista dos cursos com notas fechadas.
    // =========================================================

    getEstado = async (req, res, next) => {

        try {

            const idCurso =
                req.query?.idCurso ??
                req.user?.cursoCoordenado;


            const estado =
                await this.#configuracaoNotasService
                    .getEstado(idCurso);


            return res
                .status(200)
                .json(estado);

        } catch (error) {

            next(error);
        }
    };


    // =========================================================
    // POST /api/v1/notas-config/fechar
    // =========================================================

    fechar = async (req, res, next) => {

        try {

            if (!this.#ehCoordenador(req.user)) {

                throw new ErrorResponse(
                    403,
                    "Apenas o coordenador pode fechar as notas.",
                    {
                        message:
                            "Acesso negado."
                    }
                );
            }


            const resultado =
                await this.#configuracaoNotasService
                    .fecharNotas(
                        req.user.registro,
                        req.body?.senha
                    );


            return res
                .status(200)
                .json(resultado);

        } catch (error) {

            next(error);
        }
    };


    // =========================================================
    // POST /api/v1/notas-config/liberar
    // =========================================================

    liberar = async (req, res, next) => {

        try {

            if (!this.#ehCoordenador(req.user)) {

                throw new ErrorResponse(
                    403,
                    "Apenas o coordenador pode liberar as notas.",
                    {
                        message:
                            "Acesso negado."
                    }
                );
            }


            const resultado =
                await this.#configuracaoNotasService
                    .liberarNotas(
                        req.user.registro
                    );


            return res
                .status(200)
                .json(resultado);

        } catch (error) {

            next(error);
        }
    };

};