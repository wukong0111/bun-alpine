import Alpine from 'alpinejs';
import ajax from '@imacrayon/alpine-ajax';

Alpine.plugin(ajax);

interface User {
  id: number;
  name: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
}

interface UsersResponse {
  users: User[];
}

interface AddUserResponse {
  success: boolean;
  user?: User;
}

interface AppData {
  healthLoading: boolean;
  healthResult: string;
  usersLoading: boolean;
  users: User[];
  addUserLoading: boolean;
  addUserResult: string;
  newUser: { name: string };
  checkHealth(): Promise<void>;
  loadUsers(): Promise<void>;
  addUser(): Promise<void>;
}

declare global {
  interface Window {
    appData: AppData;
  }
}

const appData: AppData = {
  healthLoading: false,
  healthResult: "",
  usersLoading: false,
  users: [],
  addUserLoading: false,
  addUserResult: "",
  newUser: { name: "" },

  async checkHealth() {
    this.healthLoading = true;
    this.healthResult = "";
    
    try {
      const response = await fetch("/app/health");
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as HealthResponse;
      this.healthResult = `Status: ${data.status} - ${data.timestamp}`;
    } catch (error) {
      this.healthResult = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    } finally {
      this.healthLoading = false;
    }
  },

  async loadUsers() {
    this.usersLoading = true;
    
    try {
      const response = await fetch("/app/users");
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as UsersResponse;
      this.users = data.users;
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      this.usersLoading = false;
    }
  },

  async addUser() {
    if (!this.newUser.name.trim()) return;
    
    this.addUserLoading = true;
    this.addUserResult = "";
    
    try {
      const response = await fetch("/app/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.newUser),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as AddUserResponse;
      
      if (data.success) {
        this.addUserResult = `User "${this.newUser.name}" added successfully!`;
        this.newUser.name = "";
        this.loadUsers();
      } else {
        this.addUserResult = "Error adding user";
      }
    } catch (error) {
      this.addUserResult = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    } finally {
      this.addUserLoading = false;
    }
  },
};

window.appData = appData;

Alpine.start();