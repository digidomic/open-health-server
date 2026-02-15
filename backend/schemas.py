from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import date, datetime

class HealthDataBase(BaseModel):
    datum: str
    schritte: Optional[int] = 0
    schlaf_stunden: Optional[float] = 0.0
    schlaf_index: Optional[float] = 0.0
    herzfrequenz_ruhe: Optional[int] = 0
    herzfrequenz_avg: Optional[int] = 0
    gewicht: Optional[float] = 0.0
    aktivitaetsenergie: Optional[int] = 0
    training_minuten: Optional[int] = 0
    notizen: Optional[str] = ""

class HealthDataCreate(HealthDataBase):
    pass

class HealthDataResponse(HealthDataBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()
    
    class Config:
        from_attributes = True

class HealthStats(BaseModel):
    total_entries: int
    avg_schritte: float
    avg_schlaf_stunden: float
    avg_schlaf_index: float
    avg_herzfrequenz_ruhe: float
    avg_herzfrequenz_avg: float
    avg_gewicht: float
    avg_aktivitaetsenergie: float
    avg_training_minuten: float
    max_schritte: int
    min_schritte: int
    trend_schritte: str
    trend_schlaf: str
