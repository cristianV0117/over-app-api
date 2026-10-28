import type {
  CvColumn,
  CvHeaderModel,
  CvSectionModel,
  CvSectionType,
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
  fontFamily: "calibri",
  repeatSidebar: false,
  fontScale: 100,
};

export function defaultCvHeader(name: string, email: string): CvHeaderModel {
  return {
    fullName: name || "Tu nombre",
    role: "Backend Developer",
    location: "Bogotá, Colombia",
    phone: "",
    email: email || "",
    photoDataUrl: "",
    showPhoto: false,
  };
}

export function defaultCvSections(): CvSectionModel[] {
  const sections = [
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
            institution: "Universidad San José",
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
      id: "icons-1",
      type: "icons",
      column: "sidebar",
      order: 5,
      visible: true,
      title: "Stack",
      config: {
        items: ["php", "js", "ts", "mysql", "node", "nestjs", "laravel", "git"],
      },
    },
    {
      id: "languages-1",
      type: "languages",
      column: "sidebar",
      order: 6,
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
      order: 7,
      visible: true,
      title: "Cursos",
      config: {
        items: [
          { title: "Curso avanzado de PHP", provider: "Udemy", date: "Jul. 2021" },
          { title: "Curso de API REST con PHP", provider: "Udemy", date: "Jul. 2021" },
          { title: "Curso profesional de Scrum", provider: "Udemy", date: "Ago. 2021" },
          { title: "Principios SOLID aplicados", provider: "CodelyTV", date: "Oct. 2021" },
          { title: "Arquitectura hexagonal", provider: "CodelyTV", date: "Feb. 2023" },
          { title: "Curso avanzado de Laravel", provider: "Udemy", date: "Jun. 2023" },
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
            startMonth: "2024-11",
            endMonth: "2026-01",
            current: false,
            description:
              "Mantenimiento e implementación de funcionalidades, modernización de arquitectura (DDD, hexagonal) y flujos de datos.",
            tags: ["PHP", "Laravel", "MySQL"],
          },
        ],
      },
    },
    {
      id: "projects-1",
      type: "projects",
      column: "main",
      order: 1,
      visible: true,
      title: "Proyectos",
      config: {
        items: [
          {
            name: "OVER APP",
            role: "Autor · Full stack",
            tagline: "OS personal: finanzas, tareas, vehículo, archivos y asistente",
            description:
              "Aplicación propia para organizar el día a día. API hexagonal en NestJS y frontend Next.js.",
            url: "https://over-api-application-production.up.railway.app/",
            imageDataUrl: "",
            tags: ["NestJS", "Next.js", "MongoDB"],
          },
        ],
      },
    },
  ];
  return sections.map(
    (section): CvSectionModel => ({
      ...section,
      type: section.type as CvSectionType,
      column: section.column as CvColumn,
      scale: 100,
      breakBefore: false,
    })
  );
}
