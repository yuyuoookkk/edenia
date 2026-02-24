"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, X } from "lucide-react";

type Owner = { id: string; name: string; unitNumber: string | null; monthlyDues: number };

export default function AdminOwnersPage() {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formUnit, setFormUnit] = useState("");

    useEffect(() => {
        fetchOwners();
    }, []);

    const fetchOwners = async () => {
        const res = await fetch("/api/owners");
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        arr.sort((a: Owner, b: Owner) => {
            const matchA = a.unitNumber?.match(/\d+/);
            const matchB = b.unitNumber?.match(/\d+/);
            const numA = matchA ? parseInt(matchA[0], 10) : 0;
            const numB = matchB ? parseInt(matchB[0], 10) : 0;
            return numA - numB;
        });
        setOwners(arr);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/owners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: `Unit ${formUnit || "Unknown"}`,
                unitNumber: formUnit,
                monthlyDues: 0, // Hardcoded to 0 since input was removed
            }),
        });
        setShowForm(false);
        setFormUnit("");
        fetchOwners();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this owner? This will NOT delete their transactions.")) return;
        await fetch(`/api/owners?id=${id}`, { method: "DELETE" });
        fetchOwners();
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manage Villa Owners</h1>
                    <p className="text-slate-400 text-sm">Add and remove villa owner records</p>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-gradient-to-r from-violet-500 to-purple-500 text-white"
                >
                    {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    {showForm ? "Cancel" : "Add Owner"}
                </Button>
            </div>

            {showForm && (
                <Card className="border-violet-500/30 bg-slate-900/80">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">New Owner</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Unit Number</Label>
                                <Input
                                    value={formUnit}
                                    onChange={(e) => setFormUnit(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-white"
                                    placeholder="e.g. 15"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Button type="submit" className="bg-gradient-to-r from-violet-500 to-purple-500 text-white">
                                    Save Owner
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="border-slate-700/50 bg-slate-900/50 overflow-hidden">
                <Table className="text-sm">
                    <TableHeader className="bg-slate-800/50">
                        <TableRow className="border-slate-700">
                            <TableHead className="text-slate-300">Unit</TableHead>
                            <TableHead className="text-slate-300 text-center w-[60px]">Delete</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {owners.map((owner) => (
                            <TableRow key={owner.id} className="border-slate-800 hover:bg-slate-800/50">
                                <TableCell className="text-slate-300 font-medium">{owner.unitNumber || "-"}</TableCell>
                                <TableCell className="text-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                        onClick={() => handleDelete(owner.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {owners.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center text-slate-500">
                                    No owners found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
