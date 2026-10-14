// Configuración de las tablas MySQL que usan el CRUD genérico.
export const RECURSOS = {
  ubicaciones: {
    titulo: "Ubicaciones",
    singular: "ubicación",
    base: "/catalogo/ubicaciones",
    pk: "id_ubicacion",
    campos: [
      { name: "ciudad", label: "Ciudad", type: "text" },
      { name: "estado", label: "Estado", type: "text" },
      { name: "latitud", label: "Latitud", type: "number" },
      { name: "longitud", label: "Longitud", type: "number" },
    ],
  },
  usuarios: {
    titulo: "Usuarios",
    singular: "usuario",
    base: "/catalogo/usuarios",
    pk: "id_usuario",
    campos: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "correo", label: "Correo", type: "email" },
      { name: "rol", label: "Rol", type: "text" },
    ],
  },
  semanas: {
    titulo: "Semanas",
    singular: "semana",
    base: "/calendario/semanas",
    pk: "id_semana",
    campos: [
      { name: "numero_semana", label: "Número de semana", type: "number" },
      { name: "anio", label: "Año", type: "number" },
      {
        name: "estacion_anio",
        label: "Estación",
        type: "select",
        opciones: ["Primavera", "Verano", "Otoño", "Invierno"],
      },
    ],
  },
  dias: {
    titulo: "Días",
    singular: "día",
    base: "/calendario/dias",
    pk: "id_dia",
    campos: [
      { name: "id_semana", label: "ID de semana", type: "number" },
      { name: "fecha", label: "Fecha", type: "date" },
      { name: "nombre_dia", label: "Nombre del día", type: "text" },
      { name: "es_fin_de_semana", label: "Es fin de semana", type: "checkbox" },
    ],
  },
};
