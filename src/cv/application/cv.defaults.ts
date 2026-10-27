import type {
  CvHeaderModel,
  CvSectionModel,
  CvThemeModel,
} from "src/shared/infrastructure/mongo/schemas/cv.schema";

export const DEFAULT_CV_THEME: CvThemeModel = {
  sidebarBg: "#4A1830",
  sidebarText: "#FFFFFF",
  sidebarMuted: "#E8D0D8",
  accent: "#E8C9A8",
  pageBg: "#F7F4F1",
  heading: "#3D1528",
  body: "#2C2426",
  chipBg: "#6B2A44",
  chipText: "#FFFFFF",
};

export function defaultCvHeader(name: string, email: string): CvHeaderModel {
  return {
    fullName: name || "Tu nombre",
    role: "Backend Developer",
    location: "Bogotá, Colombia",
    phone: "",
    email: email || "",
  };
}

export function defaultCvSections(): CvSectionModel[] {
  return [
    {
      id: "about-1",
      type: "about",
      column: "sidebar",
      order: 0,
      visible: true,
      title: "Sobre mí",
      config: {
        text: "Desarrollador de software con más de seis años de experiencia laboral en diversas empresas de sectores clave en comercio y tecnología, aplicando conocimientos y aptitudes en el campo del desarrollo.",
      },
    },
    {
      id: "personal-1",
      type: "personal",
      column: "sidebar",
      order: 1,
      visible: true,
      title: "Datos personales",
      config: {
        items: [{ label: "Fecha de nacimiento", value: "" }],
      },
    },
    {
      id: "links-1",
      type: "links",
      column: "sidebar",
      order: 2,
      visible: true,
      title: "Enlaces",
      config: {
        items: [
          { label: "GitHub", url: "https://github.com/" },
          { label: "LinkedIn", url: "https://www.linkedin.com/" },
        ],
      },
    },
    {
      id: "education-1",
      type: "education",
      column: "sidebar",
      order: 3,
      visible: true,
      title: "Educación",
      config: {
        items: [
          {
            title: "Ingeniería en sistemas",
            place: "Bogotá",
            year: "2025",
            detail: "Ingeniero de Sistemas.",
          },
        ],
      },
    },
    {
      id: "skills-1",
      type: "skills",
      column: "sidebar",
      order: 4,
      visible: true,
      title: "Habilidades",
      config: {
        items: [
          "Arquitectura hexagonal",
          "Principios SOLID",
          "Microservicios",
          "TypeScript",
          "NestJS",
          "Node JS",
          "PHP",
          "Laravel",
          "Mongo DB",
          "MySQL",
          "API REST",
          "Git",
          "RabbitMQ",
          "DDD",
          "SCRUM",
        ],
      },
    },
    {
      id: "languages-1",
      type: "languages",
      column: "sidebar",
      order: 5,
      visible: true,
      title: "Idiomas",
      config: {
        items: [
          { name: "Español", level: "Nativo" },
          { name: "Inglés", level: "" },
        ],
      },
    },
    {
      id: "courses-1",
      type: "courses",
      column: "sidebar",
      order: 6,
      visible: true,
      title: "Cursos",
      config: {
        items: [
          { title: "Curso avanzado de PHP", date: "Jul. 2021" },
          { title: "Curso de API REST con PHP", date: "Jul. 2021" },
          { title: "Curso profesional de Scrum", date: "Ago. 2021" },
          { title: "Principios SOLID aplicados", date: "Oct. 2021" },
          { title: "Arquitectura hexagonal", date: "Feb. 2023" },
          { title: "Curso avanzado de Laravel", date: "Jun. 2023" },
        ],
      },
    },
    {
      id: "experience-1",
      type: "experience",
      column: "main",
      order: 0,
      visible: true,
      title: "Experiencia laboral",
      config: {
        items: [
          {
            company: "Empresa",
            role: "Desarrollador BackEnd",
            location: "Bogotá",
            start: "nov. 2024",
            end: "ene. 2026",
            duration: "1 año 3 meses",
            description:
              "Mantenimiento e implementación de funcionalidades, modernización de arquitectura (DDD, hexagonal) y flujos de datos.",
          },
        ],
      },
    },
  ];
}
