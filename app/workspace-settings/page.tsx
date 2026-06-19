"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function WorkspaceSettingsPage() {
  const [name, setName] = useState("Your Company");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-screen pt-20 pb-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold gradient-text">Workspace Settings</h1>
          <p className="text-slate-400 mt-2">Manage your workspace configuration</p>
        </motion.div>

        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Update your workspace information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex gap-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>Edit</Button>
                ) : (
                  <>
                    <Button onClick={() => setIsEditing(false)}>Save</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Members */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Manage workspace members and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "You", email: "you@example.com", role: "Admin" },
                  { name: "Sarah Chen", email: "sarah@example.com", role: "Member" },
                  { name: "Mike Johnson", email: "mike@example.com", role: "Member" },
                ].map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center justify-between p-3 glass-dark rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-sm text-slate-400">{member.email}</p>
                    </div>
                    <span className="px-3 py-1 text-sm rounded-full bg-blue-500/20 text-blue-300">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-red-400">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="bg-red-500/20 text-red-300 hover:bg-red-500/30">
                Delete Workspace
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
