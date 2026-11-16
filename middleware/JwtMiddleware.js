const MeuTokenJWT = require("../http/MeuTokenJWT");

module.exports = class JwtMiddleware {

validateToken = (req, res, next) => {

    const authorization =
        req.headers.authorization;

    if (!authorization) {

        return res.status(401).json({
            status: false,
            msg: "Token não informado"
        });
    }


    const jwt =
        new MeuTokenJWT();


    const autorizado =
        jwt.validarToken(authorization);


    if (autorizado !== true) {

        return res.status(401).json({
            status: false,
            msg: "Token inválido ou expirado"
        });
    }


    const payload =
        jwt.payload;


    const registro =
        payload.registro
            ? Number(payload.registro)
            : null;


    /*
     * O cursoCoordenado vem direto do token
     * (setado no login, a partir da coluna
     * CursoCoordenado_idCurso do banco).
     */

    const cursoCoordenado =
        payload.coordenador === true ||
        payload.coordenador === 1
            ? (payload.cursoCoordenado ?? null)
            : null;


    req.user = {

        registro: registro,

        matricula:
            payload.matricula || null,

        nome:
            payload.nome || null,

        email:
            payload.email || null,

        role:
            payload.role || "aluno",

        coordenador:
            payload.coordenador || 0,

        cursoCoordenado:
            cursoCoordenado

    };

    next();
};


};