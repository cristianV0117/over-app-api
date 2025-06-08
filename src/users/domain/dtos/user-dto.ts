export type UserDto = {
  id?: string;
  name: string;
  email: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserLoginDto = Omit<UserDto, "email" | "password" | "name"> & {
  email: string;
  password: string;
  token: string;
  name: string;
};
